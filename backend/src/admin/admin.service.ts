import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tableau de bord mobile/back-office (section 4.4/4.5). */
  async dashboard() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [activeMembers, attendanceToday, revenueToday, revenueMonth, todaySessions] =
      await Promise.all([
        this.prisma.membership.count({
          where: {
            status: 'ACTIVE',
            endDate: { gte: new Date() },
          },
        }),
        this.prisma.booking.count({
          where: {
            status: 'ATTENDED',
            attendedAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        this.prisma.payment.aggregate({
          where: { recordedAt: { gte: startOfDay, lte: endOfDay }, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: { recordedAt: { gte: startOfMonth }, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.classSession.findMany({
          where: { startsAt: { gte: startOfDay, lte: endOfDay }, status: { not: 'CANCELLED' } },
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
      alerts: await this.getAlerts(),
    };
  }

  /** Alertes : abonnements qui expirent, cours sous-remplis, no-show anormal (section 4.4). */
  private async getAlerts() {
    const in7Days = new Date(Date.now() + 7 * 86_400_000);

    const expiringMemberships = await this.prisma.membership.count({
      where: {
        status: 'ACTIVE',
        endDate: { gte: new Date(), lte: in7Days },
      },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const in3Days = new Date(Date.now() + 3 * 86_400_000);

    const underfilledSessions = await this.prisma.classSession.findMany({
      where: {
        startsAt: { gte: startOfDay, lte: in3Days },
        status: 'SCHEDULED',
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

  async expiringMemberships() {
    const in7Days = new Date(Date.now() + 7 * 86_400_000);
    return this.prisma.membership.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: new Date(), lte: in7Days },
      },
      include: { user: { select: { firstName: true, lastName: true, phone: true } }, plan: true },
      orderBy: { endDate: 'asc' },
    });
  }
}
