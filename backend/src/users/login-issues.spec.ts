import { describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service.js';

const make = <T>(cls: { prototype: T }, fields: Record<string, unknown>) => Object.assign(Object.create(cls.prototype as object), fields) as T;

const NOW = Date.now();
const user = (id: string, email: string, status = 'ACTIVE') => ({ id, firstName: id, lastName: 'X', email, phone: null, memberCode: id, status });

describe('Comptes adhérents bloqués (accueil / admin)', () => {
  it('classe les comptes : bloqués, puis désactivés, puis simples échecs', async () => {
    const attempts = [
      { email: 'fail@x.com', failures: 2, lockCount: 0, lockedUntil: null, updatedAt: new Date(NOW - 1000) },
      { email: 'lock@x.com', failures: 0, lockCount: 1, lockedUntil: new Date(NOW + 60_000), updatedAt: new Date(NOW - 2000) },
    ];
    const users = [user('a-fail', 'Fail@x.com'), user('b-suspended', 'susp@x.com', 'SUSPENDED'), user('c-lock', 'lock@x.com')];
    const svc = make(UsersService, {
      prisma: { loginAttempt: { findMany: vi.fn().mockResolvedValue(attempts) }, user: { findMany: vi.fn().mockResolvedValue(users) } },
    });
    const list = await svc.listLoginIssues();
    expect(list.map((i) => [i.id, i.reason])).toEqual([
      ['c-lock', 'LOCKED'],
      ['b-suspended', 'SUSPENDED'],
      ['a-fail', 'FAILED_ATTEMPTS'],
    ]);
    expect(list[0].lockedUntil).toBeInstanceOf(Date);
    expect(list[2].failures).toBe(2);
  });

  it('un blocage échu n’est plus affiché comme un blocage', async () => {
    const attempts = [{ email: 'old@x.com', failures: 0, lockCount: 1, lockedUntil: new Date(NOW - 5000), updatedAt: new Date(NOW - 9000) }];
    const svc = make(UsersService, {
      prisma: { loginAttempt: { findMany: vi.fn().mockResolvedValue(attempts) }, user: { findMany: vi.fn().mockResolvedValue([user('old', 'old@x.com')]) } },
    });
    const [item] = await svc.listLoginIssues();
    expect(item.reason).toBe('FAILED_ATTEMPTS');
    expect(item.lockedUntil).toBeNull();
  });

  it('débloquer supprime les échecs de l’adresse (en minuscules) et laisse une trace dans le journal', async () => {
    const deleteMany = vi.fn().mockReturnValue('delete');
    const create = vi.fn().mockReturnValue('audit');
    const transaction = vi.fn().mockResolvedValue([]);
    const svc = make(UsersService, {
      prisma: {
        user: { findFirst: vi.fn().mockResolvedValue({ id: 'u1', email: 'Karim.B@Email.com' }) },
        loginAttempt: { deleteMany },
        auditLog: { create },
        $transaction: transaction,
      },
    });
    await expect(svc.unlockLogin('u1', 'admin-1')).resolves.toEqual({ ok: true });
    expect(deleteMany).toHaveBeenCalledWith({ where: { email: 'karim.b@email.com' } });
    expect(create).toHaveBeenCalledWith({ data: { actorId: 'admin-1', action: 'UNLOCK_LOGIN', entity: 'User', entityId: 'u1' } });
    expect(transaction).toHaveBeenCalledWith(['delete', 'audit']);
  });

  it('refuse de débloquer un compte inexistant', async () => {
    const svc = make(UsersService, { prisma: { user: { findFirst: vi.fn().mockResolvedValue(null) } } });
    await expect(svc.unlockLogin('nope', 'admin-1')).rejects.toMatchObject({ response: { message: 'USER_NOT_FOUND' } });
  });
});
