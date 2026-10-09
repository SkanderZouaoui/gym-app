import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_ATTENDANCE_POLICY, type AttendancePolicy } from '@muscleup/shared';
import { AccessPolicyService } from './access-policy.service.js';

type FakeMembership = {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  createdAt: Date;
  plan: Record<string, never>;
};

function makeMembership(overrides: Partial<FakeMembership> = {}): any {
  return {
    id: 'membership-1',
    userId: 'user-1',
    planId: 'plan-1',
    status: 'ACTIVE',
    createdAt: new Date(),
    plan: {},
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'session-1',
    status: 'SCHEDULED',
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 3_600_000),
    ...overrides,
  };
}

describe('AccessPolicyService', () => {
  let prisma: any;
  let organizationService: any;
  let service: AccessPolicyService;
  let attendancePolicy: AttendancePolicy;

  beforeEach(() => {
    attendancePolicy = structuredClone(DEFAULT_ATTENDANCE_POLICY);

    prisma = {
      booking: { count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null) },
    };
    organizationService = {
      getSettings: vi.fn().mockResolvedValue({ attendancePolicy }),
    };
    service = new AccessPolicyService(prisma, organizationService);
  });

  describe('canBook — réservation (section 7.3)', () => {
    it('refuse sans abonnement', async () => {
      const session = makeSession();
      const result = await service.canBook({ id: 'user-1' }, session, null);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('NO_MEMBERSHIP');
    });

    it('refuse si l\'abonnement est expiré', async () => {
      const session = makeSession();
      const membership = makeMembership({ status: 'EXPIRED' });
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('MEMBERSHIP_EXPIRED');
    });

    it('refuse si l\'abonnement est suspendu', async () => {
      const session = makeSession();
      const membership = makeMembership({ status: 'SUSPENDED' });
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('MEMBERSHIP_SUSPENDED');
    });

    it('autorise un abonnement actif sans pénalité no-show', async () => {
      const session = makeSession();
      const membership = makeMembership();
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(true);
    });

    it('refuse si la pénalité de no-show est active', async () => {
      attendancePolicy.noShowPenalty = { enabled: true, threshold: 3, windowDays: 30, blockBookingDays: 7 };
      prisma.booking.count.mockResolvedValue(3);
      prisma.booking.findFirst.mockResolvedValue({ createdAt: new Date() }); // no-show très récent
      const membership = makeMembership();
      const session = makeSession();
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('NO_SHOW_PENALTY_ACTIVE');
    });

    it('autorise si le dernier no-show date de plus que blockBookingDays', async () => {
      attendancePolicy.noShowPenalty = { enabled: true, threshold: 3, windowDays: 30, blockBookingDays: 7 };
      prisma.booking.count.mockResolvedValue(3);
      prisma.booking.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 10 * 86_400_000), // il y a 10 jours > 7j de blocage
      });
      const membership = makeMembership();
      const session = makeSession();
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(true);
    });
  });

  describe('evaluateAttendance — contrôles du scan (section 6.4)', () => {
    it('refuse un cours annulé', async () => {
      const session = makeSession({ status: 'CANCELLED' });
      const result = await service.evaluateAttendance(null, session, null);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('SESSION_CANCELLED');
    });

    it('refuse hors fenêtre de scan (trop tôt)', async () => {
      const session = makeSession({ startsAt: new Date(Date.now() + 3_600_000) }); // dans 1h, fenêtre = 15 min avant
      const result = await service.evaluateAttendance(null, session, makeMembership(), new Date());
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('OUTSIDE_WINDOW');
    });

    it('refuse hors fenêtre de scan (trop tard)', async () => {
      const session = makeSession({ startsAt: new Date(Date.now() - 3_600_000) }); // il y a 1h, fenêtre = 10 min après
      const result = await service.evaluateAttendance(null, session, makeMembership(), new Date());
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('OUTSIDE_WINDOW');
    });

    it('refuse sans abonnement, dans la fenêtre', async () => {
      const now = new Date();
      const session = makeSession({ startsAt: now });
      const result = await service.evaluateAttendance(null, session, null, now);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('NO_MEMBERSHIP');
    });

    it('refuse sans réservation (NO_BOOKING)', async () => {
      const now = new Date();
      const session = makeSession({ startsAt: now });
      const result = await service.evaluateAttendance(null, session, makeMembership(), now);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('NO_BOOKING');
    });

    it('refuse une réservation en liste d\'attente', async () => {
      const now = new Date();
      const session = makeSession({ startsAt: now });
      const booking = { status: 'WAITLISTED', sessionId: session.id };
      const result = await service.evaluateAttendance(booking, session, makeMembership(), now);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('BOOKING_WAITLISTED');
    });

    it('refuse si déjà pointé (ALREADY_CHECKED_IN)', async () => {
      const now = new Date();
      const session = makeSession({ startsAt: now });
      const booking = { status: 'ATTENDED', sessionId: session.id };
      const result = await service.evaluateAttendance(booking, session, makeMembership(), now);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('ALREADY_CHECKED_IN');
    });

    it('accorde la présence pour une réservation confirmée, dans la fenêtre, formule valide', async () => {
      const now = new Date();
      const session = makeSession({ startsAt: now });
      const booking = { status: 'CONFIRMED', sessionId: session.id };
      const result = await service.evaluateAttendance(booking, session, makeMembership(), now);
      expect(result.allowed).toBe(true);
    });
  });
});
