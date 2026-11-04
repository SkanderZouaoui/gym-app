import { createHash } from 'node:crypto';
import { generateMemberCode } from '../users/member-code.js';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import { Role } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from '../otp/otp.service.js';
import { AppEvent, type UserRegisteredEvent } from '../common/events.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { AuthenticatedUser } from './types/authenticated-user.js';
import type { AccessTokenPayload } from './types/jwt-payload.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Blocages temporaires progressifs de la connexion (par e-mail) : `attempts` échecs depuis le blocage précédent
 * déclenchent un blocage de `lockSeconds`. 1er blocage : 5 échecs → 30 s ; 2e : 2 échecs → 5 min ; 3e : 3 échecs → 15 min. */
export const LOGIN_LOCK_STAGES = [
  { attempts: 5, lockSeconds: 30 },
  { attempts: 2, lockSeconds: 5 * 60 },
  { attempts: 3, lockSeconds: 15 * 60 },
] as const;
/** Au-delà du dernier palier : tous les 2 échecs, on garde le blocage de 15 min. */
export const LOGIN_REPEAT_STAGE = { attempts: 2, lockSeconds: 15 * 60 } as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly otpService: OtpService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, dto.phone ? { phone: dto.phone } : undefined].filter(Boolean) as any },
    });
    if (existing) {
      throw new ConflictException('EMAIL_OR_PHONE_ALREADY_USED');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        memberCode: await generateMemberCode(this.prisma),
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: {
          create: { role: Role.MEMBER },
        },
      },
      include: { roles: true },
    });

    this.events.emit(AppEvent.USER_REGISTERED, {
      userId: user.id,
    } satisfies UserRegisteredEvent);

    return this.issueTokensForRole(user.id, Role.MEMBER, [Role.MEMBER]);
  }

  async login(dto: LoginDto): Promise<TokenPair & { roles: Role[] }> {
    const attemptKey = dto.email.trim().toLowerCase();
    await this.assertNotLocked(attemptKey);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: true },
    });
    // Un compte supprimé est traité comme inexistant ; un compte suspendu n'est révélé qu'à qui connaît son mot de
    // passe (« Compte désactivé » côté app), sans permettre de deviner quelles adresses existent.
    if (!user || user.status === 'DELETED') {
      throw await this.registerFailedLogin(attemptKey);
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw await this.registerFailedLogin(attemptKey);
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('ACCOUNT_DISABLED');
    }

    // Connexion réussie : le compteur d'échecs repart de zéro.
    await this.prisma.loginAttempt.deleteMany({ where: { email: attemptKey } });

    const roles: Role[] = user.roles.map((r) => r.role as Role);

    // Rôle par défaut au login : le premier rôle attribué (l'app propose
    // ensuite le sélecteur de rôle si l'utilisateur en cumule plusieurs).
    const defaultRole = roles[0] ?? Role.MEMBER;

    const tokens = await this.issueTokens(user.id, defaultRole, roles);
    return { ...tokens, roles };
  }

  /** Refuse la tentative si l'e-mail est bloqué (trop d'échecs) : 429 avec le délai restant en secondes. */
  private async assertNotLocked(email: string): Promise<void> {
    const attempt = await this.prisma.loginAttempt.findUnique({ where: { email } });
    if (!attempt?.lockedUntil || attempt.lockedUntil <= new Date()) return;
    const retryAfterSeconds = Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / 1000);
    throw new HttpException({ code: 'LOGIN_LOCKED', message: 'LOGIN_LOCKED', details: { retryAfterSeconds } }, HttpStatus.TOO_MANY_REQUESTS);
  }

  /** Compte un échec de connexion. Tant que le seuil du palier courant n'est pas atteint : 401 avec le nombre d'essais
   * restants ; à l'atteinte du seuil : blocage temporaire (429) de la durée du palier, puis palier suivant. */
  private async registerFailedLogin(email: string): Promise<HttpException> {
    const attempt = await this.prisma.loginAttempt.upsert({
      where: { email },
      create: { email, failures: 1 },
      update: { failures: { increment: 1 } },
    });
    const stage = LOGIN_LOCK_STAGES[attempt.lockCount] ?? LOGIN_REPEAT_STAGE;
    if (attempt.failures >= stage.attempts) {
      await this.prisma.loginAttempt.update({
        where: { email },
        data: { failures: 0, lockCount: { increment: 1 }, lockedUntil: new Date(Date.now() + stage.lockSeconds * 1000) },
      });
      return new HttpException(
        { code: 'LOGIN_LOCKED', message: 'LOGIN_LOCKED', details: { retryAfterSeconds: stage.lockSeconds } },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'INVALID_CREDENTIALS',
      details: { attemptsRemaining: stage.attempts - attempt.failures },
    });
  }

  /** Changement de rôle actif depuis le profil (section 3 : sélecteur de rôle). */
  async selectRole(userId: string, role: Role): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const roles: Role[] = user.roles.map((r) => r.role as Role);

    const authorized = roles.includes(role);
    if (!authorized) {
      throw new ForbiddenException('ROLE_NOT_AUTHORIZED');
    }

    return this.issueTokens(user.id, role, roles);
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('TOKEN_INVALID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      include: { roles: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('TOKEN_INVALID');
    }

    // Rotation : l'ancien refresh token est révoqué immédiatement.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const roles: Role[] = user.roles.map((r) => r.role as Role);
    const payload = this.jwt.decode(rawRefreshToken) as { activeRole?: Role } | null;
    const activeRole = payload?.activeRole ?? roles[0] ?? Role.MEMBER;

    return this.issueTokens(user.id, activeRole, roles);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Toujours silencieux côté réponse (ne révèle jamais si l'e-mail existe) —
   * section Compte/Profil, mot de passe oublié. */
  async requestPasswordReset(email: string, lang?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') return;
    // Plafond atteint : 429 OTP_RATE_LIMITED avec le temps restant (propagé tel quel).
    await this.otpService.generateAndStore(user.id, 'PASSWORD_RESET', undefined, lang);
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('OTP_INVALID');

    const otp = await this.otpService.verify(user.id, 'PASSWORD_RESET', code);
    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: { actorId: user.id, action: 'PASSWORD_RESET', entity: 'User', entityId: user.id },
      }),
    ]);
  }

  private async issueTokensForRole(userId: string, role: Role, roles: Role[]) {
    return this.issueTokens(userId, role, roles);
  }

  private async issueTokens(userId: string, activeRole: Role, roles: Role[]): Promise<TokenPair> {
    const payload: AccessTokenPayload = { sub: userId, activeRole, roles };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m',
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, activeRole },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL') ?? '30d',
      },
    );

    const ttlMs = this.parseTtlMs(this.config.get('JWT_REFRESH_TTL') ?? '30d');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000;
    return value * unitMs;
  }
}
