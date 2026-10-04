import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateClassTypeDto } from './dto/create-class-type.dto.js';
import type { CreateTemplateDto } from './dto/create-template.dto.js';
import type { GenerateSessionsDto } from './dto/generate-sessions.dto.js';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Types de cours -----------------------------------------------------

  findAllTypes() {
    return this.prisma.classType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  createType(dto: CreateClassTypeDto) {
    return this.prisma.classType.create({ data: dto });
  }

  // --- Modèles récurrents ---------------------------------------------------

  findTemplatesForBranch(branchId: string) {
    return this.prisma.classTemplate.findMany({
      where: { branchId, isActive: true },
      include: { classType: true, room: true, coach: { include: { user: true } } },
    });
  }

  createTemplate(dto: CreateTemplateDto) {
    return this.prisma.classTemplate.create({ data: dto });
  }

  async deactivateTemplate(id: string) {
    await this.findTemplate(id);
    return this.prisma.classTemplate.update({ where: { id }, data: { isActive: false } });
  }

  private async findTemplate(id: string) {
    const template = await this.prisma.classTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('TEMPLATE_NOT_FOUND');
    return template;
  }

  /**
   * Génère les séances concrètes (ClassSession) pour un modèle récurrent sur
   * une période donnée. Idempotent : ne recrée pas une séance déjà générée
   * pour le même créneau.
   */
  async generateSessions(templateId: string, dto: GenerateSessionsDto) {
    const template = await this.findTemplate(templateId);
    const from = new Date(dto.from);
    const to = new Date(dto.to);
    const [hour, minute] = template.startTime.split(':').map(Number);

    const created = [];
    for (const day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
      if (day.getDay() !== template.dayOfWeek) continue;

      const startsAt = new Date(day);
      startsAt.setHours(hour, minute, 0, 0);
      const endsAt = new Date(startsAt.getTime() + template.durationMin * 60_000);

      const existing = await this.prisma.classSession.findFirst({
        where: { templateId, startsAt },
      });
      if (existing) continue;

      const session = await this.prisma.classSession.create({
        data: {
          templateId,
          classTypeId: template.classTypeId,
          branchId: template.branchId,
          roomId: template.roomId,
          coachId: template.coachId,
          startsAt,
          endsAt,
          capacity: template.capacity,
        },
      });
      created.push(session);
    }

    return created;
  }

  // --- Séances --------------------------------------------------------------

  findSessions(branchId: string, from?: string, to?: string) {
    return this.prisma.classSession.findMany({
      where: {
        branchId,
        status: { not: 'CANCELLED' },
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        classType: true,
        room: true,
        coach: { include: { user: true } },
        _count: { select: { bookings: { where: { status: { in: ['CONFIRMED', 'ATTENDED'] } } } } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findSession(id: string) {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
      include: { classType: true, room: true, branch: true, coach: { include: { user: true } } },
    });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');
    return session;
  }

  findSessionsForCoach(coachId: string, from?: string, to?: string) {
    return this.prisma.classSession.findMany({
      where: {
        coachId,
        status: { not: 'CANCELLED' },
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        classType: true,
        room: true,
        _count: { select: { bookings: { where: { status: { in: ['CONFIRMED', 'ATTENDED'] } } } } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  /** Annulation d'un cours par l'admin (section 10.6) — déclenche l'audit. */
  async cancelSession(id: string, reason: string | undefined, actorId: string) {
    const session = await this.findSession(id);

    const updated = await this.prisma.classSession.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledReason: reason },
    });

    await this.prisma.booking.updateMany({
      where: { sessionId: id, status: { in: ['CONFIRMED', 'WAITLISTED'] } },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CANCEL_SESSION',
        entity: 'ClassSession',
        entityId: id,
        branchId: session.branchId,
        newValue: { reason },
      },
    });

    return updated;
  }

  async updateCapacity(id: string, capacity: number, actorId: string) {
    const session = await this.findSession(id);
    const updated = await this.prisma.classSession.update({ where: { id }, data: { capacity } });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'UPDATE_SESSION_CAPACITY',
        entity: 'ClassSession',
        entityId: id,
        branchId: session.branchId,
        oldValue: { capacity: session.capacity },
        newValue: { capacity },
      },
    });

    return updated;
  }

  async replaceCoach(id: string, coachId: string | null, actorId: string) {
    const session = await this.findSession(id);
    const updated = await this.prisma.classSession.update({ where: { id }, data: { coachId } });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'REPLACE_SESSION_COACH',
        entity: 'ClassSession',
        entityId: id,
        branchId: session.branchId,
        oldValue: { coachId: session.coachId },
        newValue: { coachId },
      },
    });

    return updated;
  }

  /** Nombre de places restantes, utilisé par bookings/attendance. */
  async availableSpots(sessionId: string): Promise<number> {
    const session = await this.findSession(sessionId);
    const confirmedCount = await this.prisma.booking.count({
      where: { sessionId, status: { in: ['CONFIRMED', 'ATTENDED'] } },
    });
    return session.capacity - confirmedCount;
  }
}
