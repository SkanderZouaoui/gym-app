import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exportJWK, exportPKCS8, exportSPKI, generateKeyPair, importPKCS8, importSPKI } from 'jose';
import { PrismaService } from '../prisma/prisma.service.js';
import { encryptPrivateKey, decryptPrivateKey } from './key-encryption.js';

/**
 * Gère les clés de signature ES256 du QR de présence (section 6.3/6.9) :
 * génération, rotation avec `kid`, export JWKS pour vérification côté
 * scanneur (y compris hors ligne).
 */
@Injectable()
export class QrKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getActiveSigningKey() {
    const existing = await this.prisma.qrSigningKey.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.generateNewKey();
  }

  async getPrivateKey(kid: string) {
    const record = await this.prisma.qrSigningKey.findUnique({ where: { kid } });
    if (!record) return null;
    const pem = decryptPrivateKey(record.privateKeyEnc, this.getMasterSecret());
    return importPKCS8(pem, 'ES256');
  }

  async getPublicKey(kid: string) {
    const record = await this.prisma.qrSigningKey.findUnique({ where: { kid } });
    if (!record) return null;
    return importSPKI(record.publicKey, 'ES256');
  }

  /** Rotation : l'ancienne clé reste `ACTIVE`→ROTATED mais valide pour vérifier des tokens déjà émis. */
  async rotateKey() {
    await this.prisma.qrSigningKey.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'ROTATED', rotatedAt: new Date() },
    });
    return this.generateNewKey();
  }

  /** JWKS public — section 6.3 ("clé publique exposée pour vérification hors ligne"). */
  async getJwks() {
    const keys = await this.prisma.qrSigningKey.findMany({
      where: { status: { in: ['ACTIVE', 'ROTATED'] } },
    });

    const jwks = await Promise.all(
      keys.map(async (k) => {
        const publicKey = await importSPKI(k.publicKey, 'ES256');
        const jwk = await exportJWK(publicKey);
        return { ...jwk, kid: k.kid, alg: 'ES256', use: 'sig' };
      }),
    );

    return { keys: jwks };
  }

  private async generateNewKey() {
    const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
    const publicKeyPem = await exportSPKI(publicKey);
    const privateKeyPem = await exportPKCS8(privateKey);
    const kid = randomUUID();

    return this.prisma.qrSigningKey.create({
      data: {
        kid,
        publicKey: publicKeyPem,
        privateKeyEnc: encryptPrivateKey(privateKeyPem, this.getMasterSecret()),
        status: 'ACTIVE',
      },
    });
  }

  private getMasterSecret(): string {
    return this.config.getOrThrow('QR_KEY_ENCRYPTION_SECRET');
  }
}
