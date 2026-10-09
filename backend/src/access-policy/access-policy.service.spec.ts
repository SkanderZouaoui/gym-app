import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_ATTENDANCE_POLICY,
  DEFAULT_MULTI_BRANCH_POLICY,
  type AttendancePolicy,
  type MultiBranchPolicy,
} from '@muscleup/shared';
import { AccessPolicyService } from './access-policy.service.js';

type FakeMembership = {
  id: string;
  userId: string;
  planId: string;
  homeBranchId: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  frozenAccessScope: 'HOME_ONLY' | 'ALL' | 'SELECTED' | null;
  createdAt: Date;
  plan: {
    accessScope: 'INHERIT' | 'HOME_ONLY' | 'ALL' | 'SELECTED';
    crossBranchBooking: 'INHERIT' | 'ENABLED' | 'DISABLED';
    crossBranchMonthlyQuota: number | null;
  };
};

function makeMembership(overrides: Partial<FakeMembership> = {}): any {
  return {
    id: 'membership-1',
    userId: 'user-1',
    planId: 'plan-1',
    homeBranchId: 'branch-home',
    status: 'ACTIVE',
    frozenAccessScope: null,
    createdAt: new Date(),
    plan: {
      accessScope: 'INHERIT',
      crossBranchBooking: 'INHERIT',
      crossBranchMonthlyQuota: null,
    },
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'session-1',
    branchId: 'branch-home',
    status: 'SCHEDULED',
    openToOtherBranches: false,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 3_600_000),
    ...overrides,
  };
}

describe('AccessPolicyService', () => {
  let prisma: any;
  let organizationService: any;
  let service: AccessPolicyService;
  let multiBranchPolicy: MultiBranchPolicy;
  let attendancePolicy: AttendancePolicy;

  beforeEach(() => {
    multiBranchPolicy = structuredClone(DEFAULT_MULTI_BRANCH_POLICY);
    attendancePolicy = structuredClone(DEFAULT_ATTENDANCE_POLICY);

    prisma = {
      planBranch: { findFirst: vi.fn().mockResolvedValue(null) },
      booking: { count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null) },
    };
    organizationService = {
      getSettings: vi.fn().mockResolvedValue({
        multiBranchPolicy,
        attendancePolicy,
      }),
    };
    service = new AccessPolicyService(prisma, organizationService);
  });

  describe('canAccessBranch — tableau de cas (section 7.3)', () => {
    const cases: {
      name: string;
      membership: Partial<FakeMembership>;
      targetBranchId: string;
      planBranchExists?: boolean;
      expectAllowed: boolean;
      expectReason?: string;
    }[] = [
      {
        name: 'site d\'origine toujours autorisé, quel que soit le scope',
        membership: { homeBranchId: 'branch-A' },
        targetBranchId: 'branch-A',
        expectAllowed: true,
      },
      {
        name: 'abonnement expiré refusé même sur site d\'origine',
        membership: { status: 'EXPIRED', homeBranchId: 'branch-A' },
        targetBranchId: 'branch-A',
        expectAllowed: false,
        expectReason: 'MEMBERSHIP_EXPIRED',
      },
      {
        name: 'abonnement suspendu refusé',
        membership: { status: 'SUSPENDED', homeBranchId: 'branch-A' },
        targetBranchId: 'branch-A',
        expectAllowed: false,
        expectReason: 'MEMBERSHIP_SUSPENDED',
      },
      {
        name: 'HOME_ONLY (défaut réseau) refuse un autre site',
        membership: { homeBranchId: 'branch-A', plan: { accessScope: 'INHERIT' } as any },
        targetBranchId: 'branch-B',
        expectAllowed: false,
        expectReason: 'PLAN_NOT_VALID_AT_BRANCH',
      },
      {
        name: 'ALL (formule) autorise un autre site',
        membership: { homeBranchId: 'branch-A', plan: { accessScope: 'ALL' } as any },
        targetBranchId: 'branch-B',
        expectAllowed: true,
      },
      {
        name: 'SELECTED avec PlanBranch existant autorise',
        membership: { homeBranchId: 'branch-A', plan: { accessScope: 'SELECTED' } as any },
        targetBranchId: 'branch-B',
        planBranchExists: true,
        expectAllowed: true,
      },
      {
        name: 'SELECTED sans PlanBranch refuse',
        membership: { homeBranchId: 'branch-A', plan: { accessScope: 'SELECTED' } as any },
        targetBranchId: 'branch-B',
        planBranchExists: false,
        expectAllowed: false,
        expectReason: 'PLAN_NOT_VALID_AT_BRANCH',
      },
      {
        name: 'formule contractuelle (frozenAccessScope=HOME_ONLY) ignore un changement de règle réseau vers ALL',
        membership: {
          homeBranchId: 'branch-A',
          frozenAccessScope: 'HOME_ONLY',
          plan: { accessScope: 'ALL' } as any, // la formule dit ALL mais la souscription est gelée
        },
        targetBranchId: 'branch-B',
        expectAllowed: false,
        expectReason: 'PLAN_NOT_VALID_AT_BRANCH',
      },
    ];

    for (const c of cases) {
      it(c.name, async () => {
        prisma.planBranch.findFirst.mockResolvedValue(c.planBranchExists ? { id: 'pb-1' } : null);
        const membership = makeMembership(c.membership);
        const result = await service.canAccessBranch(membership, c.targetBranchId, multiBranchPolicy);
        expect(result.allowed).toBe(c.expectAllowed);
        if (c.expectReason) expect(result.reasonCode).toBe(c.expectReason);
      });
    }
  });

  describe('canBook — réservation inter-sites (section 7.3)', () => {
    it('refuse si le cours n\'est pas ouvert aux autres sites', async () => {
      const membership = makeMembership({ plan: { accessScope: 'ALL', crossBranchBooking: 'ENABLED' } as any });
      const session = makeSession({ branchId: 'branch-other', openToOtherBranches: false });
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('CROSS_BRANCH_BOOKING_DISABLED');
    });

    it('autorise si ouvert aux autres sites et mode ENABLED', async () => {
      const membership = makeMembership({ plan: { accessScope: 'ALL', crossBranchBooking: 'ENABLED' } as any });
      const session = makeSession({ branchId: 'branch-other', openToOtherBranches: true });
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(true);
    });

    it('refuse hors fenêtre de réservation inter-sites (LIMITED)', async () => {
      multiBranchPolicy.crossBranchBooking = { mode: 'LIMITED', monthlyQuota: 4, bookingWindowHours: 24 };
      const membership = makeMembership({ plan: { accessScope: 'ALL', crossBranchBooking: 'INHERIT' } as any });
      const session = makeSession({
        branchId: 'branch-other',
        openToOtherBranches: true,
        startsAt: new Date(Date.now() + 48 * 3_600_000), // dans 48h, fenêtre = 24h
      });
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('CROSS_BRANCH_WINDOW_NOT_OPEN');
    });

    it('refuse si le quota mensuel inter-sites est atteint', async () => {
      multiBranchPolicy.crossBranchBooking = { mode: 'LIMITED', monthlyQuota: 2, bookingWindowHours: 24 };
      prisma.booking.count.mockResolvedValue(2); // déjà au quota
      const membership = makeMembership({ plan: { accessScope: 'ALL', crossBranchBooking: 'INHERIT' } as any });
      const session = makeSession({
        branchId: 'branch-other',
        openToOtherBranches: true,
        startsAt: new Date(Date.now() + 3_600_000),
      });
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('CROSS_BRANCH_QUOTA_EXCEEDED');
    });

    it('le quota par formule prime sur le quota réseau', async () => {
      multiBranchPolicy.crossBranchBooking = { mode: 'LIMITED', monthlyQuota: 10, bookingWindowHours: 24 };
      prisma.booking.count.mockResolvedValue(1);
      const membership = makeMembership({
        plan: { accessScope: 'ALL', crossBranchBooking: 'INHERIT', crossBranchMonthlyQuota: 1 } as any,
      });
      const session = makeSession({
        branchId: 'branch-other',
        openToOtherBranches: true,
        startsAt: new Date(Date.now() + 3_600_000),
      });
      const result = await service.canBook({ id: 'user-1' }, session, membership);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('CROSS_BRANCH_QUOTA_EXCEEDED');
    });

    it('refuse sans abonnement', async () => {
      const session = makeSession();
      const result = await service.canBook({ id: 'user-1' }, session, null);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('NO_MEMBERSHIP');
    });

    it('refuse si la pénalité de no-show est active', async () => {
      attendancePolicy.noShowPenalty = { enabled: true, threshold: 3, windowDays: 30, blockBookingDays: 7 };
      prisma.booking.count.mockResolvedValue(3);
      prisma.booking.findFirst.mockResolvedValue({ createdAt: new Date() }); // no-show très récent
      const membership = makeMembership();
      const session = makeSession(); // site d'origine, pas de souci de cross-branch
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

    it('refuse une formule non valable sur ce site (PLAN_NOT_VALID_AT_BRANCH)', async () => {
      const now = new Date();
      const session = makeSession({ startsAt: now, branchId: 'branch-other' });
      const booking = { status: 'CONFIRMED', sessionId: session.id };
      const membership = makeMembership({ homeBranchId: 'branch-A', plan: { accessScope: 'HOME_ONLY' } as any });
      const result = await service.evaluateAttendance(booking, session, membership, now);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe('PLAN_NOT_VALID_AT_BRANCH');
    });
  });
});
