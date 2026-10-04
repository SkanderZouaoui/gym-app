import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aujourd'hui : cours du jour, remplissage, présences en cours (section 4.3/4.4). */
  async today(branchId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.classSession.findMany({
      where: {
        branchId,
        startsAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        classType: true,
        room: true,
        coach: { include: { user: { select: { firstName: true, lastName: true } } } },
        _count: {
          select: { bookings: { where: { status: { in: ['CONFIRMED', 'ATTENDED'] } } } },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    const attendedCount = await this.prisma.booking.count({
      where: {
        status: 'ATTENDED',
        session: { branchId, startsAt: { gte: startOfDay, lte: endOfDay } },
      },
    });

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        classTypeName: s.classType.name,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        status: s.status,
        room: s.room?.name,
        coachName: s.coach ? `${s.coach.user.firstName} ${s.coach.user.lastName}` : null,
        capacity: s.capacity,
        booked: s._count.bookings,
        fillRate: s.capacity > 0 ? Math.round((s._count.bookings / s.capacity) * 100) : 0,
      })),
      attendedToday: attendedCount,
    };
  }

  async addMemberNote(userId: string, body: string, authorId: string) {
    return this.prisma.memberNote.create({ data: { userId, authorId, body } });
  }

  async getMemberNotes(userId: string) {
    return this.prisma.memberNote.findMany({
      where: { userId },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
