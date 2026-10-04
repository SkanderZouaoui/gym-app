import { createHash } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import { Role } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppEvent, type UserRegisteredEvent } from '../common/events.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { AuthenticatedUser, BranchRoleGrant } from './types/authenticated-user.js';
import type { AccessTokenPayload } from './types/jwt-payload.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
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
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        homeBranchId: dto.homeBranchId,
        branchRoles: {
          create: { role: Role.MEMBER, branchId: dto.homeBranchId ?? null },
        },
      },
      include: { branchRoles: true },
    });

    this.events.emit(AppEvent.USER_REGISTERED, {
      userId: user.id,
      referralCode: dto.referralCode,
    } satisfies UserRegisteredEvent);

    return this.issueTokensForRole(user.id, Role.MEMBER, dto.homeBranchId ?? null);
  }

  async login(dto: LoginDto): Promise<TokenPair & { grants: BranchRoleGrant[] }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { branchRoles: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const grants: BranchRoleGrant[] = user.branchRoles.map((r) => ({
      role: r.role as Role,
      branchId: r.branchId,
    }));

    // Rôle par défaut au login : le premier rôle attribué (l'app propose
    // ensuite le sélecteur de rôle si l'utilisateur en cumule plusieurs).
    const defaultGrant = grants[0] ?? { role: Role.MEMBER, branchId: user.homeBranchId };

    const tokens = await this.issueTokens(user.id, defaultGrant.role, grants, user.homeBranchId);
    return { ...tokens, grants };
  }

  /** Changement de rôle actif depuis le profil (section 3 : sélecteur de rôle). */
  async selectRole(userId: string, role: Role, branchId: string | undefined): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branchRoles: true },
    });
    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const grants: BranchRoleGrant[] = user.branchRoles.map((r) => ({
      role: r.role as Role,
      branchId: r.branchId,
    }));

    const authorized = grants.some(
      (g) => g.role === role && (g.branchId === null || g.branchId === branchId),
    );
    if (!authorized) {
      throw new ForbiddenException('ROLE_NOT_AUTHORIZED');
    }

    return this.issueTokens(user.id, role, grants, user.homeBranchId);
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('TOKEN_INVALID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      include: { branchRoles: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('TOKEN_INVALID');
    }

    // Rotation : l'ancien refresh token est révoqué immédiatement.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const grants: BranchRoleGrant[] = user.branchRoles.map((r) => ({
      role: r.role as Role,
      branchId: r.branchId,
    }));
    const payload = this.jwt.decode(rawRefreshToken) as { activeRole?: Role } | null;
    const activeRole = payload?.activeRole ?? grants[0]?.role ?? Role.MEMBER;

    return this.issueTokens(user.id, activeRole, grants, user.homeBranchId);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokensForRole(userId: string, role: Role, branchId: string | null) {
    return this.issueTokens(userId, role, [{ role, branchId }], branchId);
  }

  private async issueTokens(
    userId: string,
    activeRole: Role,
    grants: BranchRoleGrant[],
    homeBranchId: string | null,
  ): Promise<TokenPair> {
    const payload: AccessTokenPayload = { sub: userId, activeRole, grants, homeBranchId };

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

  toPublicGrants(grants: BranchRoleGrant[]) {
    return grants;
  }
}
