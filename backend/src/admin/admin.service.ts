import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tableau de bord mobile/back-office (section 4.4/4.5). `branchId` undefined = tous les sites (admin réseau). */
  async dashboard(branchId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const branchFilter = branchId ? { branchId } : {};

    const [activeMembers, attendanceToday, revenueToday, revenueMonth, todaySessions] =
      await Promise.all([
        this.prisma.membership.count({
          where: {
            status: 'ACTIVE',
            endDate: { gte: new Date() },
            ...(branchId ? { homeBranchId: branchId } : {}),
          },
        }),
        this.prisma.booking.count({
          where: {
            status: 'ATTENDED',
            attendedAt: { gte: startOfDay, lte: endOfDay },
            session: branchFilter,
          },
        }),
        this.prisma.payment.aggregate({
          where: { recordedAt: { gte: startOfDay, lte: endOfDay }, deletedAt: null, ...branchFilter },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: { recordedAt: { gte: startOfMonth }, deletedAt: null, ...branchFilter },
          _sum: { amount: true },
        }),
        this.prisma.classSession.findMany({
          where: { startsAt: { gte: startOfDay, lte: endOfDay }, status: { not: 'CANCELLED' }, ...branchFilter },
          include: { _count: { select: { bookings: { where: { status: { in: ['CONFIRMED', 'ATTENDED'] } } } } } },
        }),
      ]);

    const avgFillRate =
      todaySessions.length > 0
        ? Math.round(
            todaySessions.reduce(
              (sum, s) => sum + (s.capacity > 0 ? s._count.bookings / s.capacity : 0),
              0,
            ) / todaySessions.length * 100,
          )
        : 0;

    return {
      activeMembers,
      attendanceToday,
      revenueToday: revenueToday._sum.amount ?? 0,
      revenueMonth: revenueMonth._sum.amount ?? 0,
      classesToday: todaySessions.length,
      avgFillRate,
      alerts: await this.getAlerts(branchId),
    };
  }

  /** Alertes : abonnements qui expirent, cours sous-remplis, no-show anormal (section 4.4). */
  private async getAlerts(branchId?: string) {
    const in7Days = new Date(Date.now() + 7 * 86_400_000);
    const branchFilter = branchId ? { branchId } : {};

    const expiringMemberships = await this.prisma.membership.count({
      where: {
        status: 'ACTIVE',
        endDate: { gte: new Date(), lte: in7Days },
        ...(branchId ? { homeBranchId: branchId } : {}),
      },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const in3Days = new Date(Date.now() + 3 * 86_400_000);

    const underfilledSessions = await this.prisma.classSession.findMany({
      where: {
        startsAt: { gte: startOfDay, lte: in3Days },
        status: 'SCHEDULED',
        ...branchFilter,
      },
      include: { _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } }, classType: true },
    });
    const underfilled = underfilledSessions.filter(
      (s) => s.capacity > 0 && s._count.bookings / s.capacity < 0.3,
    );

    return {
      expiringMemberships,
      underfilledClasses: underfilled.length,
    };
  }

  async expiringMemberships(branchId?: string) {
    const in7Days = new Date(Date.now() + 7 * 86_400_000);
    return this.prisma.membership.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: new Date(), lte: in7Days },
        ...(branchId ? { homeBranchId: branchId } : {}),
      },
      include: { user: { select: { firstName: true, lastName: true, phone: true } }, plan: true },
      orderBy: { endDate: 'asc' },
    });
  }
}
