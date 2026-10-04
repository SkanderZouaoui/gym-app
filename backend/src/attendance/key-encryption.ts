import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** Chiffrement au repos des clés privées QR (AES-256-GCM) — section 8.4/13. */
function getMasterKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptPrivateKey(plaintext: string, secret: string): string {
  const key = getMasterKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
}

export function decryptPrivateKey(ciphertext: string, secret: string): string {
  const [ivB64, authTagB64, dataB64] = ciphertext.split('.');
  const key = getMasterKey(secret);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}
