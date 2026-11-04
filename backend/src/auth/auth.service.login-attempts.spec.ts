import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as argon2 from 'argon2';
import { AuthService, LOGIN_LOCK_SECONDS, LOGIN_MAX_ATTEMPTS } from './auth.service.js';

const EMAIL = 'karim.b@email.com';
const PASSWORD = 'Correct-horse-1';

/** Base minimale en mémoire : un utilisateur et la table des tentatives de connexion. */
function makeService(user: Record<string, unknown> | null) {
  const attempts = new Map<string, { email: string; failures: number; lockedUntil: Date | null }>();
  const prisma = {
    user: { findUnique: async () => user },
    loginAttempt: {
      findUnique: async ({ where }: any) => attempts.get(where.email) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const row = attempts.get(where.email);
        const next = row ? { ...row, failures: row.failures + update.failures.increment } : { email: where.email, failures: create.failures, lockedUntil: null };
        attempts.set(where.email, next);
        return next;
      },
      update: async ({ where, data }: any) => {
        const next = { ...attempts.get(where.email)!, ...data };
        attempts.set(where.email, next);
        return next;
      },
      deleteMany: async ({ where }: any) => {
        attempts.delete(where.email);
      },
    },
  };
  const jwt = { signAsync: async () => 'token' };
  const config = { getOrThrow: () => 'secret', get: () => '15m' };
  const service = new AuthService(prisma as any, jwt as any, config as any, { emit: () => true } as any, {} as any);
  // L'émission des jetons n'est pas l'objet de ces tests.
  (service as any).issueTokens = async () => ({ accessToken: 'a', refreshToken: 'r' });
  return { service, attempts };
}

describe('AuthService.login — tentatives restantes et blocage temporaire', () => {
  let passwordHash: string;
  beforeAll(async () => {
    passwordHash = await argon2.hash(PASSWORD);
  });

  let user: Record<string, unknown>;
  beforeEach(() => {
    user = { id: 'u1', email: EMAIL, passwordHash, status: 'ACTIVE', roles: [{ role: 'MEMBER' }] };
  });

  const login = (service: AuthService, password: string) => service.login({ email: EMAIL, password } as any);

  it('annonce le nombre d’essais restants à chaque échec', async () => {
    const { service } = makeService(user);
    for (let failed = 1; failed < LOGIN_MAX_ATTEMPTS; failed++) {
      await expect(login(service, 'mauvais')).rejects.toMatchObject({
        response: { code: 'INVALID_CREDENTIALS', details: { attemptsRemaining: LOGIN_MAX_ATTEMPTS - failed } },
      });
    }
  });

  it('bloque temporairement au 5e échec, même avec le bon mot de passe ensuite', async () => {
    const { service } = makeService(user);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i++) await login(service, 'mauvais').catch(() => undefined);
    await expect(login(service, 'mauvais')).rejects.toMatchObject({
      status: 429,
      response: { code: 'LOGIN_LOCKED', details: { retryAfterSeconds: LOGIN_LOCK_SECONDS } },
    });
    await expect(login(service, PASSWORD)).rejects.toMatchObject({ status: 429, response: { code: 'LOGIN_LOCKED' } });
  });

  it('remet le compteur à zéro après une connexion réussie', async () => {
    const { service, attempts } = makeService(user);
    await login(service, 'mauvais').catch(() => undefined);
    await login(service, 'mauvais').catch(() => undefined);
    await expect(login(service, PASSWORD)).resolves.toMatchObject({ roles: ['MEMBER'] });
    expect(attempts.has(EMAIL)).toBe(false);
    await expect(login(service, 'mauvais')).rejects.toMatchObject({ response: { details: { attemptsRemaining: LOGIN_MAX_ATTEMPTS - 1 } } });
  });

  it('compte aussi les essais sur une adresse inconnue, sans rien révéler', async () => {
    const { service } = makeService(null);
    await expect(login(service, 'x')).rejects.toMatchObject({
      response: { code: 'INVALID_CREDENTIALS', details: { attemptsRemaining: LOGIN_MAX_ATTEMPTS - 1 } },
    });
  });

  it('ne compte pas un compte suspendu dont le mot de passe est correct', async () => {
    const { service, attempts } = makeService({ ...user, status: 'SUSPENDED' });
    await expect(login(service, PASSWORD)).rejects.toMatchObject({ response: { message: 'ACCOUNT_DISABLED' } });
    expect(attempts.has(EMAIL)).toBe(false);
  });

  it('autorise de nouveau la connexion une fois le blocage écoulé', async () => {
    const { service, attempts } = makeService(user);
    attempts.set(EMAIL, { email: EMAIL, failures: 0, lockedUntil: new Date(Date.now() - 1000) });
    await expect(login(service, PASSWORD)).resolves.toBeDefined();
  });
});
