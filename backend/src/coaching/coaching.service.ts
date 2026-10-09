import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateAvailabilityDto } from './dto/create-availability.dto.js';
import type { RequestSessionDto } from './dto/request-session.dto.js';

@Injectable()
export class CoachingService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Disponibilités -----------------------------------------------------

  async setAvailability(coachId: string, dto: CreateAvailabilityDto) {
    return this.prisma.coachAvailability.create({
      data: {
        coachId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  getAvailability(coachId: string) {
    return this.prisma.coachAvailability.findMany({ where: { coachId } });
  }

  async removeAvailability(id: string, coachId: string) {
    const availability = await this.prisma.coachAvailability.findUnique({ where: { id } });
    if (!availability || availability.coachId !== coachId) throw new NotFoundException('AVAILABILITY_NOT_FOUND');
    await this.prisma.coachAvailability.delete({ where: { id } });
  }

  /** Disponibilités visibles par l'adhérent pour réserver une séance (section 4.1). */
  async getCoachAvailabilityForMembers() {
    return this.prisma.coachAvailability.findMany({
      include: {
        coach: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
  }

  /** Fiche coach (bio, spécialités) pour la fiche détail côté adhérent. */
  async getCoachProfile(coachId: string) {
    const coach = await this.prisma.coachProfile.findUnique({
      where: { userId: coachId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!coach) throw new NotFoundException('COACH_NOT_FOUND');
    return coach;
  }

  // --- Séances individuelles ----------------------------------------------

  /** Demande de séance par l'adhérent — statut PENDING jusqu'à confirmation du coach. */
  async requestSession(memberId: string, dto: RequestSessionDto) {
    return this.prisma.coachingSession.create({
      data: {
        coachId: dto.coachId,
        memberId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        status: 'PENDING',
        objective: dto.objective,
      },
    });
  }

  async confirmSession(id: string, coachId: string) {
    const session = await this.findOwnedByCoach(id, coachId);
    return this.prisma.coachingSession.update({ where: { id: session.id }, data: { status: 'CONFIRMED' } });
  }

  async declineSession(id: string, coachId: string) {
    const session = await this.findOwnedByCoach(id, coachId);
    return this.prisma.coachingSession.update({ where: { id: session.id }, data: { status: 'CANCELLED' } });
  }

  async cancelByMember(id: string, memberId: string) {
    const session = await this.prisma.coachingSession.findUnique({ where: { id } });
    if (!session || session.memberId !== memberId) throw new NotFoundException('SESSION_NOT_FOUND');
    return this.prisma.coachingSession.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  getPendingRequests(coachId: string) {
    return this.prisma.coachingSession.findMany({
      where: { coachId, status: 'PENDING' },
      include: { member: { select: { firstName: true, lastName: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  getForCoach(coachId: string) {
    return this.prisma.coachingSession.findMany({
      where: { coachId, status: { in: ['CONFIRMED', 'PENDING'] } },
      include: { member: { select: { firstName: true, lastName: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  getForMember(memberId: string) {
    return this.prisma.coachingSession.findMany({
      where: { memberId },
      include: { coach: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { startsAt: 'desc' },
    });
  }

  /** Liste des élèves suivis par le coach — fusion programmes assignés + séances individuelles
   * passées/à venir (section 4.2 : "les adhérents apparaissent après une séance ou une
   * assignation de programme"). */
  async getStudents(coachId: string) {
    const [programs, sessions] = await Promise.all([
      this.prisma.program.findMany({
        where: { createdById: coachId },
        select: { assignedTo: { select: { id: true, firstName: true, lastName: true, photoKey: true } } },
        distinct: ['assignedToId'],
      }),
      this.prisma.coachingSession.findMany({
        where: { coachId },
        select: { member: { select: { id: true, firstName: true, lastName: true, photoKey: true } } },
        distinct: ['memberId'],
      }),
    ]);

    const byId = new Map<string, { id: string; firstName: string; lastName: string; photoKey: string | null }>();
    for (const p of programs) byId.set(p.assignedTo.id, p.assignedTo);
    for (const s of sessions) byId.set(s.member.id, s.member);

    return Array.from(byId.values()).sort((a, b) => a.firstName.localeCompare(b.firstName));
  }

  private async findOwnedByCoach(id: string, coachId: string) {
    const session = await this.prisma.coachingSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');
    if (session.coachId !== coachId) throw new ForbiddenException('NOT_YOUR_SESSION');
    return session;
  }
}
