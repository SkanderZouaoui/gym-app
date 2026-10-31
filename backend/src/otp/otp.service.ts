import { randomInt, createHash } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { OtpPurpose } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { buildOtpMail } from '../mail/otp-mail.js';

const OTP_TTL_MS = 10 * 60 * 1000;
/** Plafond de codes générés par compte et par usage sur la fenêtre glissante (anti e-mail bombing). */
export const OTP_MAX_PER_WINDOW = 5;
export const OTP_WINDOW_MS = 60 * 60 * 1000;

/** Codes à usage unique (6 chiffres) — mot de passe oublié, changement
 * d'e-mail. Le code est envoyé par e-mail (MailService) et n'est jamais loggé. */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Lève 429 OTP_RATE_LIMITED (avec `details.retryAfterSeconds`) si OTP_MAX_PER_WINDOW codes
   * ont déjà été générés dans la dernière heure ; un créneau se libère quand le plus ancien
   * des OTP_MAX_PER_WINDOW derniers codes sort de la fenêtre. */
  async generateAndStore(userId: string, purpose: OtpPurpose, newEmail?: string) {
    const recent = await this.prisma.otpCode.findMany({
      where: { userId, purpose, createdAt: { gt: new Date(Date.now() - OTP_WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
      take: OTP_MAX_PER_WINDOW,
      select: { createdAt: true },
    });
    if (recent.length >= OTP_MAX_PER_WINDOW) {
      const unlockAt = recent[OTP_MAX_PER_WINDOW - 1].createdAt.getTime() + OTP_WINDOW_MS;
      const retryAfterSeconds = Math.max(1, Math.ceil((unlockAt - Date.now()) / 1000));
      this.logger.warn(`Génération de code ${purpose} bloquée (plafond atteint) pour l'utilisateur ${userId}`);
      throw new HttpException(
        { code: 'OTP_RATE_LIMITED', message: 'OTP_RATE_LIMITED', details: { retryAfterSeconds } },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

    await this.prisma.otpCode.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await this.prisma.otpCode.create({
      data: {
        userId,
        purpose,
        codeHash: this.hashCode(code),
        newEmail,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
    const to = newEmail ?? user?.email;
    if (!user || !to) return;

    // Envoi en arrière-plan : le délai du SMTP ne doit pas trahir l'existence d'un compte
    // (mot de passe oublié) et une panne SMTP ne doit pas faire échouer la requête.
    void this.mail
      .send(
        buildOtpMail({
          purpose,
          to,
          firstName: user.firstName,
          code,
          brand: this.config.get<string>('MAIL_BRAND') ?? 'MuscleUP',
        }),
      )
      .then((sent) => {
        if (!sent) this.logger.error(`Code ${purpose} non délivré pour l'utilisateur ${userId}`);
      });
  }

  /** Vérifie le code sans le consommer — l'appelant marque `consumedAt`
   * lui-même une fois l'effet métier appliqué (transaction atomique). */
  async verify(userId: string, purpose: OtpPurpose, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new UnauthorizedException('OTP_INVALID');
    if (otp.expiresAt < new Date()) throw new UnauthorizedException('OTP_EXPIRED');
    if (otp.codeHash !== this.hashCode(code)) throw new UnauthorizedException('OTP_INVALID');
    return otp;
  }

  async consume(otpId: string) {
    await this.prisma.otpCode.update({ where: { id: otpId }, data: { consumedAt: new Date() } });
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
