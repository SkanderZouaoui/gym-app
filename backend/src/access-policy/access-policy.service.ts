import { Injectable } from '@nestjs/common';
import type { ClassSession, Membership, MembershipPlan, User } from '@prisma/client';
import type { AttendancePolicy } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrganizationService } from '../organization/organization.service.js';
import { allow, deny, type PolicyResult } from './access-policy.types.js';

type MembershipWithPlan = Membership & { plan: MembershipPlan };

/**
 * Point d'entrée unique pour les règles de réservation et de présence.
 * Aucune règle métier ne doit être dupliquée dans les contrôleurs.
 */
@Injectable()
export class AccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationService: OrganizationService,
  ) {}

  /** Réservation d'un cours. */
  async canBook(
    user: Pick<User, 'id'>,
    session: ClassSession,
    membership: MembershipWithPlan | null,
  ): Promise<PolicyResult> {
    if (!membership) return deny('NO_MEMBERSHIP');
    if (membership.status === 'EXPIRED') return deny('MEMBERSHIP_EXPIRED');
    if (membership.status === 'SUSPENDED') return deny('MEMBERSHIP_SUSPENDED');

    const settings = await this.organizationService.getSettings();
    const attendancePolicy = settings.attendancePolicy as unknown as AttendancePolicy;

    const noShowCheck = await this.checkNoShowPenalty(user.id, attendancePolicy);
    if (!noShowCheck.allowed) return noShowCheck;

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
   * Règles du scan de présence (section 6.4).
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

    if (!booking) return deny('NO_BOOKING');
    if (booking.status === 'CANCELLED') return deny('BOOKING_CANCELLED');
    if (booking.status === 'WAITLISTED') return deny('BOOKING_WAITLISTED');
    if (booking.status === 'ATTENDED') return deny('ALREADY_CHECKED_IN');

    return allow();
  }
}
