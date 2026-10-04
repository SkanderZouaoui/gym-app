import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT, exportSPKI, generateKeyPair } from 'jose';
import { QrTokenService } from './qr-token.service.js';

describe('QrTokenService', () => {
  let prisma: any;
  let qrKeysService: any;
  let service: QrTokenService;
  let publicKeyPem: string;
  let privateKey: CryptoKey;
  const kid = 'test-key-1';

  beforeEach(async () => {
    const keyPair = await generateKeyPair('ES256', { extractable: true });
    privateKey = keyPair.privateKey;
    publicKeyPem = await exportSPKI(keyPair.publicKey);

    prisma = {
      usedQrToken: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
    };

    qrKeysService = {
      getActiveSigningKey: vi.fn().mockResolvedValue({ kid }),
      getPrivateKey: vi.fn().mockResolvedValue(privateKey),
      getPublicKey: vi.fn().mockImplementation(async (requestedKid: string) => {
        if (requestedKid !== kid) return null;
        const { importSPKI } = await import('jose');
        return importSPKI(publicKeyPem, 'ES256');
      }),
    };

    service = new QrTokenService(prisma, qrKeysService);
  });

  it("émet un token vérifiable et l'accepte une première fois", async () => {
    const { token } = await service.issueToken('user-1');
    const result = await service.verifyAndConsume(token);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.userId).toBe('user-1');
    }
  });

  it('rejette un token déjà utilisé (anti-rejeu, section 6.3)', async () => {
    const { token } = await service.issueToken('user-1');
    await service.verifyAndConsume(token); // 1er scan : consomme le jti

    prisma.usedQrToken.findUnique.mockResolvedValue({ jti: 'already-used' }); // simule la 2e tentative
    const result = await service.verifyAndConsume(token);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('TOKEN_REPLAYED');
  });

  it('rejette un token expiré', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = await new SignJWT({ sub: 'user-1' })
      .setProtectedHeader({ alg: 'ES256', kid })
      .setIssuedAt(now - 120)
      .setExpirationTime(now - 60) // expiré il y a 60s
      .setJti('expired-jti')
      .sign(privateKey);

    const result = await service.verifyAndConsume(expiredToken);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('TOKEN_EXPIRED');
  });

  it('rejette un token signé avec une clé inconnue (kid invalide)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ sub: 'user-1' })
      .setProtectedHeader({ alg: 'ES256', kid: 'unknown-kid' })
      .setIssuedAt(now)
      .setExpirationTime(now + 45)
      .setJti('some-jti')
      .sign(privateKey);

    const result = await service.verifyAndConsume(token);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('TOKEN_INVALID');
  });

  it('rejette un token signé avec une autre clé privée (signature invalide)', async () => {
    const otherKeyPair = await generateKeyPair('ES256', { extractable: true });
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ sub: 'user-1' })
      .setProtectedHeader({ alg: 'ES256', kid }) // prétend utiliser la bonne clé...
      .setIssuedAt(now)
      .setExpirationTime(now + 45)
      .setJti('forged-jti')
      .sign(otherKeyPair.privateKey); // ...mais signé avec une autre

    const result = await service.verifyAndConsume(token);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('TOKEN_INVALID');
  });

  it('rejette un token malformé', async () => {
    const result = await service.verifyAndConsume('not-a-valid-jwt');
    expect(result.valid).toBe(false);
  });
});
