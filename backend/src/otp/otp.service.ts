import { randomInt, createHash } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const OTP_TTL_MS = 10 * 60 * 1000;

/** Codes à usage unique (6 chiffres) — mot de passe oublié, changement
 * d'e-mail. Aucun fournisseur d'e-mail n'est branché pour l'instant : le
 * code est loggé en console (section Compte/Profil, mode dev) à la place
 * d'un envoi réel — à remplacer par un vrai envoi plus tard sans changer
 * cette interface. */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateAndStore(userId: string, purpose: OtpPurpose, newEmail?: string) {
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

    this.logger.warn(`[DEV OTP] purpose=${purpose} userId=${userId} code=${code} (valide 10 min)`);
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
