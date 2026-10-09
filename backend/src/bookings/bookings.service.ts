import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ClassSession, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccessPolicyService } from '../access-policy/access-policy.service.js';
import { generateBookingCode } from './booking-code.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicyService: AccessPolicyService,
  ) {}

  findForUser(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        session: {
          include: { classType: true, room: true, coach: { include: { user: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Réservation d'un cours. La capacité est garantie par un verrou
   * transactionnel sur la séance (section 12) : au-delà de la capacité,
   * l'adhérent est placé en liste d'attente plutôt que refusé.
   */
  async create(userId: string, sessionId: string) {
    try {
      return await this.doCreate(userId, sessionId);
    } catch (err: any) {
      // Filet de sécurité en cas de course concurrente sur l'index unique
      // partiel (deux requêtes quasi simultanées) — transforme l'erreur
      // Prisma brute en réponse HTTP propre plutôt qu'une 500.
      if (err?.code === 'P2002') {
        throw new ConflictException('ALREADY_BOOKED');
      }
      throw err;
    }
  }

  private async doCreate(userId: string, sessionId: string) {
    const activeMembership = await this.prisma.membership.findFirst({
      where: { userId, status: 'ACTIVE', endDate: { gte: new Date() } },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.$queryRaw<
        { id: string; capacity: number; starts_at: Date; status: string }[]
      >`SELECT id, capacity, starts_at, status FROM class_sessions WHERE id = ${sessionId} FOR UPDATE`;

      if (session.length === 0) throw new NotFoundException('SESSION_NOT_FOUND');
      const s = session[0];
      if (s.status === 'CANCELLED') throw new BadRequestException('SESSION_CANCELLED');

      const sessionForPolicy: Pick<ClassSession, 'id' | 'capacity' | 'startsAt' | 'status'> = {
        id: s.id,
        capacity: s.capacity,
        startsAt: s.starts_at,
        status: s.status as ClassSession['status'],
      };

      const policyCheck = await this.accessPolicyService.canBook(
        { id: userId },
        sessionForPolicy as ClassSession,
        activeMembership,
      );
      if (!policyCheck.allowed) {
        throw new BadRequestException(policyCheck.reasonCode);
      }

      const existing = await tx.booking.findFirst({
        where: { sessionId, userId, status: { in: ['CONFIRMED', 'WAITLISTED'] } },
      });
      if (existing) throw new ConflictException('ALREADY_BOOKED');

      const confirmedCount = await tx.booking.count({
        where: { sessionId, status: { in: ['CONFIRMED', 'ATTENDED'] } },
      });

      const bookingCode = await this.uniqueBookingCode(tx);

      if (confirmedCount < s.capacity) {
        return tx.booking.create({
          data: { sessionId, userId, status: 'CONFIRMED', bookingCode },
          include: { session: { include: { classType: true } } },
        });
      }

      const waitlistCount = await tx.booking.count({
        where: { sessionId, status: 'WAITLISTED' },
      });

      return tx.booking.create({
        data: {
          sessionId,
          userId,
          status: 'WAITLISTED',
          waitlistPosition: waitlistCount + 1,
          bookingCode,
        },
        include: { session: { include: { classType: true } } },
      });
    });
  }

  /** Annulation par l'adhérent. Promeut automatiquement le 1er en liste d'attente. */
  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.userId !== userId) throw new NotFoundException('BOOKING_NOT_FOUND');
    if (booking.status === 'CANCELLED') return booking;

    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      if (booking.status === 'CONFIRMED') {
        await this.promoteNextInWaitlist(tx, booking.sessionId);
      } else if (booking.status === 'WAITLISTED') {
        await this.resequenceWaitlist(tx, booking.sessionId);
      }

      return cancelled;
    });
  }

  private async promoteNextInWaitlist(tx: Tx, sessionId: string) {
    const next = await tx.booking.findFirst({
      where: { sessionId, status: 'WAITLISTED' },
      orderBy: { waitlistPosition: 'asc' },
    });
    if (!next) return;

    await tx.booking.update({
      where: { id: next.id },
      data: { status: 'CONFIRMED', waitlistPosition: null },
    });

    await this.resequenceWaitlist(tx, sessionId);
    // La notification push de promotion sera envoyée par le module notifications
    // via l'événement booking.promoted (phase notifications).
  }

  private async resequenceWaitlist(tx: Tx, sessionId: string) {
    const waitlisted = await tx.booking.findMany({
      where: { sessionId, status: 'WAITLISTED' },
      orderBy: { waitlistPosition: 'asc' },
    });
    for (let i = 0; i < waitlisted.length; i++) {
      if (waitlisted[i].waitlistPosition !== i + 1) {
        await tx.booking.update({
          where: { id: waitlisted[i].id },
          data: { waitlistPosition: i + 1 },
        });
      }
    }
  }

  private async uniqueBookingCode(tx: Tx): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateBookingCode();
      const existing = await tx.booking.findUnique({ where: { bookingCode: code } });
      if (!existing) return code;
    }
    throw new ConflictException('BOOKING_CODE_GENERATION_FAILED');
  }

  /** Inscrire un adhérent au nom de celui-ci (staff/admin/coach — section 4). */
  async createOnBehalf(targetUserId: string, sessionId: string) {
    return this.create(targetUserId, sessionId);
  }
}
