import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface PeriodFilter {
  branchId?: string;
  from: Date;
  to: Date;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Présence et remplissage des cours sur la période (section 11). */
  async getAttendanceStats({ branchId, from, to }: PeriodFilter) {
    const sessions = await this.prisma.classSession.findMany({
      where: {
        startsAt: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
        ...(branchId ? { branchId } : {}),
      },
      select: {
        id: true,
        capacity: true,
        _count: {
          select: {
            bookings: { where: { status: { in: ['CONFIRMED', 'ATTENDED', 'NO_SHOW'] } } },
          },
        },
      },
    });

    const attended = await this.prisma.booking.count({
      where: {
        status: 'ATTENDED',
        session: { startsAt: { gte: from, lte: to }, ...(branchId ? { branchId } : {}) },
      },
    });
    const noShow = await this.prisma.booking.count({
      where: {
        status: 'NO_SHOW',
        session: { startsAt: { gte: from, lte: to }, ...(branchId ? { branchId } : {}) },
      },
    });

    const totalCapacity = sessions.reduce((sum, s) => sum + s.capacity, 0);
    const totalBooked = sessions.reduce((sum, s) => sum + s._count.bookings, 0);
    const totalConfirmedOrAttended = attended + noShow; // dénominateur du taux de no-show

    return {
      sessionsCount: sessions.length,
      totalCapacity,
      totalBooked,
      fillRate: totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0,
      attended,
      noShow,
      noShowRate: totalConfirmedOrAttended > 0 ? Math.round((noShow / totalConfirmedOrAttended) * 100) : 0,
    };
  }

  /** Revenus par mode de paiement sur la période (section 11). */
  async getRevenueStats({ branchId, from, to }: PeriodFilter) {
    const payments = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { recordedAt: { gte: from, lte: to }, deletedAt: null, ...(branchId ? { branchId } : {}) },
      _sum: { amount: true },
      _count: true,
    });

    const total = payments.reduce((sum, p) => sum + Number(p._sum.amount ?? 0), 0);

    return {
      total,
      byMethod: payments.map((p) => ({
        method: p.method,
        amount: Number(p._sum.amount ?? 0),
        count: p._count,
      })),
    };
  }

  /** Nouveaux adhérents sur la période, agrégés par jour (section 11). */
  async getNewMembersStats({ branchId, from, to }: PeriodFilter) {
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        deletedAt: null,
        ...(branchId ? { homeBranchId: branchId } : {}),
        branchRoles: { some: { role: 'MEMBER' } },
      },
      select: { createdAt: true },
    });

    const byDay = new Map<string, number>();
    for (const u of users) {
      const key = u.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    return {
      total: users.length,
      byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    };
  }

  /**
   * Rétention / churn simplifié : parmi les adhérents dont l'abonnement
   * était actif 30 jours avant `to`, quelle proportion a toujours un
   * abonnement actif à `to` (section 11).
   */
  async getRetentionStats({ branchId, to }: { branchId?: string; to: Date }) {
    const referenceDate = new Date(to.getTime() - 30 * 86_400_000);

    const activeAtReference = await this.prisma.membership.findMany({
      where: {
        startDate: { lte: referenceDate },
        endDate: { gte: referenceDate },
        ...(branchId ? { homeBranchId: branchId } : {}),
      },
      select: { userId: true },
    });

    const userIds = [...new Set(activeAtReference.map((m) => m.userId))];
    if (userIds.length === 0) {
      return { cohortSize: 0, retainedCount: 0, retentionRate: 0, churnRate: 0 };
    }

    const stillActive = await this.prisma.membership.findMany({
      where: {
        userId: { in: userIds },
        status: 'ACTIVE',
        startDate: { lte: to },
        endDate: { gte: to },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const retainedCount = stillActive.length;
    const retentionRate = Math.round((retainedCount / userIds.length) * 100);

    return {
      cohortSize: userIds.length,
      retainedCount,
      retentionRate,
      churnRate: 100 - retentionRate,
    };
  }

  /** Vue d'ensemble combinée pour le back-office (section 11). */
  async getOverview(filter: PeriodFilter) {
    const [attendance, revenue, newMembers, retention] = await Promise.all([
      this.getAttendanceStats(filter),
      this.getRevenueStats(filter),
      this.getNewMembersStats(filter),
      this.getRetentionStats({ branchId: filter.branchId, to: filter.to }),
    ]);

    return { attendance, revenue, newMembers, retention };
  }

  /** Export CSV des encaissements sur la période (section 11). */
  async exportPaymentsCsv({ branchId, from, to }: PeriodFilter): Promise<string> {
    const payments = await this.prisma.payment.findMany({
      where: { recordedAt: { gte: from, lte: to }, deletedAt: null, ...(branchId ? { branchId } : {}) },
      include: {
        membership: { include: { user: true, plan: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { recordedAt: 'asc' },
    });

    const header = 'Date,Adhérent,Formule,Montant,Mode,Enregistré par,Référence';
    const rows = payments.map((p) =>
      [
        p.recordedAt.toISOString(),
        `${p.membership.user.firstName} ${p.membership.user.lastName}`,
        p.membership.plan.name,
        p.amount.toString(),
        p.method,
        `${p.recordedBy.firstName} ${p.recordedBy.lastName}`,
        p.reference ?? '',
      ]
        .map(csvEscape)
        .join(','),
    );

    return [header, ...rows].join('\n');
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
