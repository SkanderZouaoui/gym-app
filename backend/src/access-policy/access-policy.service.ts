import { Injectable } from '@nestjs/common';
import type { Branch, ClassSession, Membership, MembershipPlan, User } from '@prisma/client';
import type { AttendancePolicy, MultiBranchPolicy, Role } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrganizationService } from '../organization/organization.service.js';
import { allow, deny, type PolicyResult } from './access-policy.types.js';

type MembershipWithPlan = Membership & { plan: MembershipPlan };

/**
 * Point d'entrée unique pour toutes les règles d'accès multi-sites, de
 * réservation et de présence (section 7.6 du document de conception).
 * Aucune règle métier ne doit être dupliquée dans les contrôleurs.
 */
@Injectable()
export class AccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationService: OrganizationService,
  ) {}

  /** Validité de la formule de l'adhérent pour accéder à un site donné. */
  async canAccessBranch(
    membership: MembershipWithPlan,
    branchId: string,
    multiBranchPolicy?: MultiBranchPolicy,
  ): Promise<PolicyResult> {
    if (membership.status === 'EXPIRED') return deny('MEMBERSHIP_EXPIRED');
    if (membership.status === 'SUSPENDED') return deny('MEMBERSHIP_SUSPENDED');

    if (membership.homeBranchId === branchId) return allow();

    const policy = multiBranchPolicy ?? (await this.getMultiBranchPolicy());

    const effectiveScope =
      membership.frozenAccessScope ??
      (membership.plan.accessScope === 'INHERIT' ? policy.defaultAccessScope : membership.plan.accessScope);

    if (effectiveScope === 'ALL') return allow();

    if (effectiveScope === 'SELECTED') {
      const planBranch = await this.prisma.planBranch.findFirst({
        where: { planId: membership.planId, branchId },
      });
      if (planBranch) return allow();
      return deny('PLAN_NOT_VALID_AT_BRANCH');
    }

    // HOME_ONLY (ou défaut) et ce n'est pas le site d'origine.
    return deny('PLAN_NOT_VALID_AT_BRANCH');
  }

  /**
   * Réservation d'un cours : intersection entre l'accès formule au site et
   * la règle de réservation inter-sites (quota, fenêtre, indicateur par
   * cours) — section 7.3.
   */
  async canBook(
    user: Pick<User, 'id'>,
    session: ClassSession,
    membership: MembershipWithPlan | null,
  ): Promise<PolicyResult> {
    if (!membership) return deny('NO_MEMBERSHIP');

    const settings = await this.organizationService.getSettings();
    const multiBranchPolicy = settings.multiBranchPolicy as unknown as MultiBranchPolicy;
    const attendancePolicy = settings.attendancePolicy as unknown as AttendancePolicy;

    const branchAccess = await this.canAccessBranch(membership, session.branchId, multiBranchPolicy);
    if (!branchAccess.allowed) return branchAccess;

    const isHomeBranch = membership.homeBranchId === session.branchId;
    if (!isHomeBranch) {
      const crossBranchCheck = await this.checkCrossBranchBooking(
        user.id,
        session,
        membership,
        multiBranchPolicy,
      );
      if (!crossBranchCheck.allowed) return crossBranchCheck;
    }

    const noShowCheck = await this.checkNoShowPenalty(user.id, attendancePolicy);
    if (!noShowCheck.allowed) return noShowCheck;

    return allow();
  }

  private async checkCrossBranchBooking(
    userId: string,
    session: ClassSession,
    membership: MembershipWithPlan,
    networkPolicy: MultiBranchPolicy,
  ): Promise<PolicyResult> {
    if (!session.openToOtherBranches) return deny('CROSS_BRANCH_BOOKING_DISABLED');

    const mode =
      membership.plan.crossBranchBooking === 'INHERIT'
        ? networkPolicy.crossBranchBooking.mode
        : membership.plan.crossBranchBooking;

    if (mode === 'DISABLED') return deny('CROSS_BRANCH_BOOKING_DISABLED');

    if (mode === 'LIMITED' || mode === 'ENABLED') {
      const windowHours = networkPolicy.crossBranchBooking.bookingWindowHours;
      if (windowHours) {
        const hoursUntilStart = (session.startsAt.getTime() - Date.now()) / 3_600_000;
        if (hoursUntilStart > windowHours) return deny('CROSS_BRANCH_WINDOW_NOT_OPEN');
      }
    }

    if (mode === 'LIMITED') {
      const quota =
        membership.plan.crossBranchMonthlyQuota ?? networkPolicy.crossBranchBooking.monthlyQuota;
      if (quota != null) {
        const since = new Date();
        since.setDate(1);
        since.setHours(0, 0, 0, 0);
        const usedThisMonth = await this.prisma.booking.count({
          where: {
            userId,
            isCrossBranch: true,
            createdAt: { gte: since },
            status: { in: ['CONFIRMED', 'ATTENDED', 'WAITLISTED'] },
          },
        });
        if (usedThisMonth >= quota) return deny('CROSS_BRANCH_QUOTA_EXCEEDED');
      }
    }

    return allow();
  }

  private async checkNoShowPenalty(
    userId: string,
    policy: AttendancePolicy,
  ): Promise<PolicyResult> {
    if (!policy.noShowPenalty.enabled) return allow();

    const since = new Date(Date.now() - policy.noShowPenalty.windowDays * 86_400_000);
    const noShowCount = await this.prisma.booking.count({
      where: { userId, status: 'NO_SHOW', createdAt: { gte: since } },
    });

    if (noShowCount < policy.noShowPenalty.threshold) return allow();

    // Le blocage s'applique pendant blockBookingDays après le dernier no-show.
    const lastNoShow = await this.prisma.booking.findFirst({
      where: { userId, status: 'NO_SHOW' },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastNoShow) return allow();

    const blockedUntil = new Date(
      lastNoShow.createdAt.getTime() + policy.noShowPenalty.blockBookingDays * 86_400_000,
    );
    if (blockedUntil > new Date()) return deny('NO_SHOW_PENALTY_ACTIVE');

    return allow();
  }

  /**
   * Règles du scan de présence (section 6.4). `scanner` est l'utilisateur
   * qui scanne (coach/staff/admin) ; sa portée de site est déjà vérifiée en
   * amont par le guard `@BranchScope()` au niveau du contrôleur.
   */
  async evaluateAttendance(
    booking: { status: string; sessionId: string } | null,
    session: ClassSession,
    membership: MembershipWithPlan | null,
    now: Date = new Date(),
  ): Promise<PolicyResult> {
    if (session.status === 'CANCELLED') return deny('SESSION_CANCELLED');

    const settings = await this.organizationService.getSettings();
    const attendancePolicy = settings.attendancePolicy as unknown as AttendancePolicy;

    const windowStart = new Date(
      session.startsAt.getTime() - attendancePolicy.scanOpensMinutesBefore * 60_000,
    );
    const windowEnd = new Date(
      session.startsAt.getTime() + attendancePolicy.scanClosesMinutesAfterStart * 60_000,
    );
    if (now < windowStart || now > windowEnd) return deny('OUTSIDE_WINDOW');

    if (!membership) return deny('NO_MEMBERSHIP');
    if (membership.status === 'EXPIRED') return deny('MEMBERSHIP_EXPIRED');
    if (membership.status === 'SUSPENDED') return deny('MEMBERSHIP_SUSPENDED');

    const branchAccess = await this.canAccessBranch(membership, session.branchId);
    if (!branchAccess.allowed) return branchAccess;

    if (!booking) return deny('NO_BOOKING');
    if (booking.status === 'CANCELLED') return deny('BOOKING_CANCELLED');
    if (booking.status === 'WAITLISTED') return deny('BOOKING_WAITLISTED');
    if (booking.status === 'ATTENDED') return deny('ALREADY_CHECKED_IN');

    return allow();
  }

  private async getMultiBranchPolicy(): Promise<MultiBranchPolicy> {
    const settings = await this.organizationService.getSettings();
    return settings.multiBranchPolicy as unknown as MultiBranchPolicy;
  }
}
