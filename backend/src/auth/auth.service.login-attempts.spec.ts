import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as argon2 from 'argon2';
import { AuthService, LOGIN_LOCK_STAGES, LOGIN_REPEAT_STAGE } from './auth.service.js';

const EMAIL = 'karim.b@email.com';
const PASSWORD = 'Correct-horse-1';

type Row = { email: string; failures: number; lockCount: number; lockedUntil: Date | null };

/** Base minimale en mémoire : un utilisateur et la table des tentatives de connexion. */
function makeService(user: Record<string, unknown> | null) {
  const attempts = new Map<string, Row>();
  const prisma = {
    user: { findUnique: async () => user },
    loginAttempt: {
      findUnique: async ({ where }: any) => attempts.get(where.email) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const row = attempts.get(where.email);
        const next: Row = row
          ? { ...row, failures: row.failures + update.failures.increment }
          : { email: where.email, failures: create.failures, lockCount: 0, lockedUntil: null };
        attempts.set(where.email, next);
        return next;
      },
      update: async ({ where, data }: any) => {
        const row = attempts.get(where.email)!;
        const next: Row = {
          ...row,
          failures: data.failures ?? row.failures,
          lockCount: data.lockCount?.increment ? row.lockCount + data.lockCount.increment : row.lockCount,
          lockedUntil: data.lockedUntil ?? row.lockedUntil,
        };
        attempts.set(where.email, next);
        return next;
      },
      deleteMany: async ({ where }: any) => {
        attempts.delete(where.email);
      },
    },
  };
  const service = new AuthService(prisma as any, {} as any, { getOrThrow: () => 'secret', get: () => '15m' } as any, { emit: () => true } as any, {} as any);
  // L'émission des jetons n'est pas l'objet de ces tests.
  (service as any).issueTokens = async () => ({ accessToken: 'a', refreshToken: 'r' });
  /** Fait écouler le blocage en cours, comme si le temps avait passé. */
  const expireLock = () => {
    const row = attempts.get(EMAIL)!;
    attempts.set(EMAIL, { ...row, lockedUntil: new Date(Date.now() - 1000) });
  };
  return { service, attempts, expireLock };
}

describe('AuthService.login — blocages temporaires progressifs', () => {
  let passwordHash: string;
  beforeAll(async () => {
    passwordHash = await argon2.hash(PASSWORD);
  });

  let user: Record<string, unknown>;
  beforeEach(() => {
    user = { id: 'u1', email: EMAIL, passwordHash, status: 'ACTIVE', roles: [{ role: 'MEMBER' }] };
  });

  const login = (service: AuthService, password: string) => service.login({ email: EMAIL, password } as any);
  const fail = (service: AuthService) => login(service, 'mauvais').catch((e) => e);

  /** Enchaîne des échecs jusqu'au blocage et renvoie la durée annoncée. */
  async function failUntilLocked(service: AuthService, attempts: number): Promise<number> {
    for (let i = 1; i < attempts; i++) {
      const e = await fail(service);
      expect(e.response.code).toBe('INVALID_CREDENTIALS');
      expect(e.response.details.attemptsRemaining).toBe(attempts - i);
    }
    const locked = await fail(service);
    expect(locked.status).toBe(429);
    expect(locked.response.code).toBe('LOGIN_LOCKED');
    return locked.response.details.retryAfterSeconds;
  }

  it('1er blocage : 30 s après 5 échecs, avec le décompte des essais restants', async () => {
    const { service } = makeService(user);
    expect(await failUntilLocked(service, LOGIN_LOCK_STAGES[0].attempts)).toBe(30);
  });

  it('refuse même le bon mot de passe pendant un blocage', async () => {
    const { service } = makeService(user);
    await failUntilLocked(service, 5);
    await expect(login(service, PASSWORD)).rejects.toMatchObject({ status: 429, response: { code: 'LOGIN_LOCKED' } });
  });

  it('puis 2 échecs → 5 min, puis 3 échecs → 15 min, puis 2 échecs → 15 min à chaque fois', async () => {
    const { service, expireLock } = makeService(user);
    expect(await failUntilLocked(service, 5)).toBe(30);
    expireLock();
    expect(await failUntilLocked(service, 2)).toBe(5 * 60);
    expireLock();
    expect(await failUntilLocked(service, 3)).toBe(15 * 60);
    expireLock();
    expect(await failUntilLocked(service, LOGIN_REPEAT_STAGE.attempts)).toBe(15 * 60);
    expireLock();
    expect(await failUntilLocked(service, LOGIN_REPEAT_STAGE.attempts)).toBe(15 * 60);
  });

  it('une connexion réussie remet tout à zéro, y compris le palier de blocage', async () => {
    const { service, attempts, expireLock } = makeService(user);
    await failUntilLocked(service, 5);
    expireLock();
    await expect(login(service, PASSWORD)).resolves.toMatchObject({ roles: ['MEMBER'] });
    expect(attempts.has(EMAIL)).toBe(false);
    // Retour au 1er palier : 5 échecs, 30 s.
    expect(await failUntilLocked(service, 5)).toBe(30);
  });

  it('compte aussi les essais sur une adresse inconnue, sans rien révéler', async () => {
    const { service } = makeService(null);
    const e = await fail(service);
    expect(e.response).toMatchObject({ code: 'INVALID_CREDENTIALS', details: { attemptsRemaining: 4 } });
  });

  it('ne compte pas un compte suspendu dont le mot de passe est correct', async () => {
    const { service, attempts } = makeService({ ...user, status: 'SUSPENDED' });
    await expect(login(service, PASSWORD)).rejects.toMatchObject({ response: { message: 'ACCOUNT_DISABLED' } });
    expect(attempts.has(EMAIL)).toBe(false);
  });
});
