import { describe, expect, it, vi } from 'vitest';
import { AttendanceService } from '../attendance/attendance.service.js';
import { UsersService } from './users.service.js';

/** Instance sans constructeur : seuls les champs utilisés par la méthode testée sont renseignés. */
const make = <T>(cls: { prototype: T }, fields: Record<string, unknown>) => Object.assign(Object.create(cls.prototype as object), fields) as T;

describe('Un coach ne voit d\'un adhérent que son nom et son inscription', () => {
  describe('liste des inscrits (roster)', () => {
    const run = async (limited: boolean) => {
      const findMany = vi.fn().mockResolvedValue([]);
      const svc = make(AttendanceService, { prisma: { classSession: { findUnique: vi.fn().mockResolvedValue({ id: 's1' }) }, booking: { findMany } } }) as AttendanceService;
      await svc.getRoster('s1', limited);
      return (findMany.mock.calls[0][0] as { include: { user: { select: Record<string, unknown> } } }).include.user.select;
    };

    it('coach : id, nom et photo seulement', async () => {
      expect(Object.keys(await run(true)).sort()).toEqual(['firstName', 'id', 'lastName', 'photoKey']);
    });

    it('accueil / admin : téléphone, code adhérent et formule en plus', async () => {
      const select = await run(false);
      expect(select).toHaveProperty('phone');
      expect(select).toHaveProperty('memberCode');
      expect(select).toHaveProperty('memberships');
    });
  });

  describe('recherche d\'adhérents', () => {
    const run = async (limited: boolean) => {
      const findMany = vi.fn().mockResolvedValue([]);
      const svc = make(UsersService, { prisma: { user: { findMany } }, storageService: { getReadUrl: vi.fn() } }) as UsersService;
      await svc.search('0612', limited);
      return findMany.mock.calls[0][0] as { where: { OR: Record<string, unknown>[] }; select: Record<string, unknown> };
    };

    it('coach : recherche par nom uniquement (pas par téléphone, e-mail ni code) et résultat limité au nom', async () => {
      const { where, select } = await run(true);
      const searched = where.OR.flatMap((c) => Object.keys(c)).sort();
      expect(searched).toEqual(['firstName', 'lastName']);
      expect(Object.keys(select).sort()).toEqual(['firstName', 'id', 'lastName', 'photoKey']);
    });

    it('accueil / admin : recherche complète et coordonnées', async () => {
      const { where, select } = await run(false);
      expect(where.OR.flatMap((c) => Object.keys(c))).toEqual(expect.arrayContaining(['phone', 'email', 'memberCode']));
      expect(select).toHaveProperty('email');
      expect(select).toHaveProperty('phone');
      expect(select).toHaveProperty('memberships');
    });
  });
});

describe('Profil adhérent vu par un coach (coachMemberView)', () => {
  const session = { id: 's1', startsAt: new Date('2026-11-01T10:00:00Z'), endsAt: new Date('2026-11-01T11:00:00Z'), status: 'SCHEDULED', classType: { name: 'Yoga Flow' }, room: { name: 'Studio A' } };
  const user = { id: 'm1', firstName: 'Ines', lastName: 'Boudiaf', photoKey: null, memberships: [{ plan: { name: 'Premium annuel' } }] };
  const make2 = (bookings: unknown[], found: unknown = user) => {
    const bookingFindMany = vi.fn().mockResolvedValue(bookings);
    const userFindFirst = vi.fn().mockResolvedValue(found);
    return { svc: make(UsersService, { prisma: { booking: { findMany: bookingFindMany }, user: { findFirst: userFindFirst } } }) as UsersService, bookingFindMany, userFindFirst };
  };

  it('renvoie le nom, le type d\'abonnement et les cours suivis avec ce coach — rien d\'autre', async () => {
    const { svc, bookingFindMany } = make2([{ id: 'b1', status: 'CONFIRMED', waitlistPosition: null, session }]);
    const view = await svc.coachMemberView('coach1', 'm1');
    expect(Object.keys(view).sort()).toEqual(['courses', 'firstName', 'id', 'lastName', 'photoKey', 'subscription']);
    expect(view.subscription).toBe('Premium annuel');
    expect(view.courses).toHaveLength(1);
    expect(view.courses[0]).toMatchObject({ className: 'Yoga Flow', room: 'Studio A', status: 'CONFIRMED' });
    // seuls les cours de CE coach sont lus
    expect(bookingFindMany.mock.calls[0][0].where).toMatchObject({ userId: 'm1', session: { coachId: 'coach1' } });
  });

  it('refuse (404) un adhérent inscrit à aucun cours de ce coach', async () => {
    const { svc, userFindFirst } = make2([]);
    await expect(svc.coachMemberView('coach1', 'm1')).rejects.toMatchObject({ status: 404 });
    expect(userFindFirst).not.toHaveBeenCalled();
  });

  it('sans abonnement actif : subscription = null', async () => {
    const { svc } = make2([{ id: 'b1', status: 'ATTENDED', waitlistPosition: null, session }], { ...user, memberships: [] });
    expect((await svc.coachMemberView('coach1', 'm1')).subscription).toBeNull();
  });
});
