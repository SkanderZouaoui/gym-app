import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_UPLOAD_BYTES, StorageService } from './storage.service.js';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    vi.stubEnv('S3_BUCKET', 'test');
    vi.stubEnv('S3_ENDPOINT', 'http://127.0.0.1:9');
    vi.stubEnv('S3_REGION', 'garage');
    vi.stubEnv('S3_ACCESS_KEY_ID', 'k');
    vi.stubEnv('S3_SECRET_ACCESS_KEY', 's');
    vi.stubEnv('S3_FORCE_PATH_STYLE', 'true');
    service = new StorageService();
  });
  afterEach(() => vi.unstubAllEnvs());

  describe('assertOwnKey', () => {
    it('accepte une clé sous le préfixe de l\'utilisateur, ou l\'absence de clé', () => {
      expect(() => service.assertOwnKey('avatars/u1/abc.jpeg', 'avatars/u1')).not.toThrow();
      expect(() => service.assertOwnKey(undefined, 'avatars/u1')).not.toThrow();
      expect(() => service.assertOwnKey(null, 'avatars/u1')).not.toThrow();
    });

    it('refuse la clé d\'un autre utilisateur, un préfixe voisin ou une remontée de dossier', () => {
      for (const key of ['avatars/u2/abc.jpeg', 'avatars/u10/abc.jpeg', 'avatars/u1evil/x.jpeg', 'avatars/u1/../u2/x.jpeg', 'class-types/c1/x.jpeg', '']) {
        expect(() => service.assertOwnKey(key, 'avatars/u1')).toThrowError(/INVALID_FILE_KEY/);
      }
    });
  });

  describe('getUploadUrl', () => {
    it('signe le Content-Length : le stockage refusera tout autre taille', async () => {
      const url = new URL(await service.getUploadUrl('avatars/u1/a.jpeg', 'image/jpeg', 1234));
      expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length');
    });

    it.each([0, -1, 1.5, MAX_UPLOAD_BYTES + 1])('refuse une taille invalide (%s)', async (size) => {
      await expect(service.getUploadUrl('avatars/u1/a.jpeg', 'image/jpeg', size)).rejects.toThrowError(/FILE_TOO_LARGE/);
    });

    it('accepte la taille maximale', async () => {
      await expect(service.getUploadUrl('avatars/u1/a.jpeg', 'image/jpeg', MAX_UPLOAD_BYTES)).resolves.toContain('X-Amz-Signature');
    });
  });
});
