import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import { QrKeysService } from './qr-keys.service.js';

const TOKEN_TTL_SECONDS = 45; // entre 30 et 60s — section 6.3
const OFFLINE_TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12h — QR de secours hors ligne (section 6.6)

export type QrVerifyResult =
  | { valid: true; userId: string; jti: string; offline: boolean }
  | { valid: false; reason: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_REPLAYED' };

@Injectable()
export class QrTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrKeysService: QrKeysService,
  ) {}

  /** Émission du token QR court-vécu pour l'adhérent — GET /v1/me/qr-token. */
  async issueToken(userId: string) {
    const { token, jti } = await this.sign(userId, TOKEN_TTL_SECONDS, false);
    return { token, expiresInSeconds: TOKEN_TTL_SECONDS, jti };
  }

  /**
   * QR de secours longue durée (12h) — à récupérer pendant qu'on est en
   * ligne et conserver en stockage sécurisé côté app pour affichage sans
   * réseau (section 6.6). Vérifié par le même mécanisme signature + anti-
   * rejeu `jti` que le token court : un seul passage possible par émission,
   * la fenêtre plus longue n'affaiblit pas l'usage unique.
   */
  async issueOfflineToken(userId: string) {
    const { token, jti } = await this.sign(userId, OFFLINE_TOKEN_TTL_SECONDS, true);
    return { token, expiresInSeconds: OFFLINE_TOKEN_TTL_SECONDS, jti };
  }

  private async sign(userId: string, ttlSeconds: number, offline: boolean) {
    const signingKey = await this.qrKeysService.getActiveSigningKey();
    const privateKey = await this.qrKeysService.getPrivateKey(signingKey.kid);
    if (!privateKey) throw new Error('QR_SIGNING_KEY_UNAVAILABLE');

    const jti = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({ sub: userId, offline })
      .setProtectedHeader({ alg: 'ES256', kid: signingKey.kid })
      .setIssuedAt(now)
      .setExpirationTime(now + ttlSeconds)
      .setJti(jti)
      .sign(privateKey);

    return { token, jti };
  }

  /**
   * Vérifie un token QR scanné : signature, expiration, et usage unique du
   * `jti` (le serveur refuse un `jti` déjà utilisé — rend inutile une
   * capture d'écran partagée, section 6.3).
   */
  async verifyAndConsume(token: string): Promise<QrVerifyResult> {
    let payload: { sub?: string; jti?: string; exp?: number; offline?: boolean };
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

    // Garder le jti bloqué jusqu'à l'expiration réelle du token (+marge) —
    // crucial pour le QR offline dont le TTL dépasse largement celui du
    // token court-vécu.
    const expiresAt = payload.exp ? new Date(payload.exp * 1000 + 60_000) : new Date(Date.now() + TOKEN_TTL_SECONDS * 1000 + 60_000);
    await this.prisma.usedQrToken.create({
      data: { jti: payload.jti, expiresAt },
    });

    return { valid: true, userId: payload.sub, jti: payload.jti, offline: payload.offline === true };
  }
}
