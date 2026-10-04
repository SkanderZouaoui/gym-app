import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import { QrKeysService } from './qr-keys.service.js';

const TOKEN_TTL_SECONDS = 45; // entre 30 et 60s — section 6.3

export type QrVerifyResult =
  | { valid: true; userId: string; jti: string }
  | { valid: false; reason: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_REPLAYED' };

@Injectable()
export class QrTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrKeysService: QrKeysService,
  ) {}

  /** Émission du token QR court-vécu pour l'adhérent — GET /v1/me/qr-token. */
  async issueToken(userId: string) {
    const signingKey = await this.qrKeysService.getActiveSigningKey();
    const privateKey = await this.qrKeysService.getPrivateKey(signingKey.kid);
    if (!privateKey) throw new Error('QR_SIGNING_KEY_UNAVAILABLE');

    const jti = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'ES256', kid: signingKey.kid })
      .setIssuedAt(now)
      .setExpirationTime(now + TOKEN_TTL_SECONDS)
      .setJti(jti)
      .sign(privateKey);

    return { token, expiresInSeconds: TOKEN_TTL_SECONDS };
  }

  /**
   * Vérifie un token QR scanné : signature, expiration, et usage unique du
   * `jti` (le serveur refuse un `jti` déjà utilisé — rend inutile une
   * capture d'écran partagée, section 6.3).
   */
  async verifyAndConsume(token: string): Promise<QrVerifyResult> {
    let payload: { sub?: string; jti?: string };
    let kid: string | undefined;

    try {
      const decodedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
      kid = decodedHeader.kid;
      if (!kid) return { valid: false, reason: 'TOKEN_INVALID' };

      const publicKey = await this.qrKeysService.getPublicKey(kid);
      if (!publicKey) return { valid: false, reason: 'TOKEN_INVALID' };

      const result = await jwtVerify(token, publicKey, { algorithms: ['ES256'] });
      payload = result.payload;
    } catch (err: any) {
      if (err?.code === 'ERR_JWT_EXPIRED') return { valid: false, reason: 'TOKEN_EXPIRED' };
      return { valid: false, reason: 'TOKEN_INVALID' };
    }

    if (!payload.sub || !payload.jti) return { valid: false, reason: 'TOKEN_INVALID' };

    const alreadyUsed = await this.prisma.usedQrToken.findUnique({ where: { jti: payload.jti } });
    if (alreadyUsed) return { valid: false, reason: 'TOKEN_REPLAYED' };

    await this.prisma.usedQrToken.create({
      data: { jti: payload.jti, expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000 + 60_000) },
    });

    return { valid: true, userId: payload.sub, jti: payload.jti };
  }
}
