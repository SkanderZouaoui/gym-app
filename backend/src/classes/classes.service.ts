import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateClassTypeDto } from './dto/create-class-type.dto.js';
import type { UpdateClassTypeDto } from './dto/update-class-type.dto.js';
import type { CreateTemplateDto } from './dto/create-template.dto.js';
import type { CreateSessionDto, UpdateSessionDto } from './dto/session-input.dto.js';
import type { CreateRoomDto, UpdateRoomDto } from './dto/room.dto.js';
import type { GenerateSessionsDto } from './dto/generate-sessions.dto.js';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // --- Types de cours -----------------------------------------------------

  async findAllTypes(includeInactive = false) {
    const types = await this.prisma.classType.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
    return Promise.all(types.map((t) => this.withGalleryUrls(t)));
  }

  /** Ajoute `galleryUrls` (URLs présignées de lecture, durée limitée) à un type de cours. */
  async withGalleryUrls<T extends { galleryKeys: string[] }>(type: T) {
    const galleryUrls = await Promise.all(type.galleryKeys.map((key) => this.storage.getReadUrl(key)));
    return { ...type, galleryUrls };
  }

  /** URL présignée d'envoi d'une photo de galerie (le client envoie directement vers le stockage). */
  async galleryUploadUrl(id: string, contentType: string, sizeBytes: number) {
    await this.findType(id);
    if (!/^image\/(jpeg|png|webp)$/.test(contentType)) throw new BadRequestException('INVALID_IMAGE_TYPE');
    const key = this.storage.buildKey(`class-types/${id}`, contentType);
    const uploadUrl = await this.storage.getUploadUrl(key, contentType, sizeBytes);
    return { key, uploadUrl };
  }

  async addGalleryImage(id: string, key: string) {
    const type = await this.findType(id);
    if (!key.startsWith(`class-types/${id}/`)) throw new BadRequestException('INVALID_GALLERY_KEY');
    if (type.galleryKeys.includes(key)) return this.withGalleryUrls(type);
    const updated = await this.prisma.classType.update({ where: { id }, data: { galleryKeys: { push: key } } });
    return this.withGalleryUrls(updated);
  }

  async removeGalleryImage(id: string, key: string) {
    const type = await this.findType(id);
    if (!type.galleryKeys.includes(key)) return this.withGalleryUrls(type);
    const updated = await this.prisma.classType.update({
      where: { id },
      data: { galleryKeys: type.galleryKeys.filter((k) => k !== key) },
    });
    await this.storage.deleteObject(key).catch(() => undefined);
    return this.withGalleryUrls(updated);
  }

  createType(dto: CreateClassTypeDto) {
    return this.prisma.classType.create({ data: dto });
  }

  async updateType(id: string, dto: UpdateClassTypeDto) {
    await this.findType(id);
    return this.prisma.classType.update({ where: { id }, data: dto });
  }

  private async findType(id: string) {
    const type = await this.prisma.classType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException('CLASS_TYPE_NOT_FOUND');
    return type;
  }

  // --- Modèles récurrents ---------------------------------------------------

  findAllTemplates() {
    return this.prisma.classTemplate.findMany({
      where: { isActive: true },
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

  async updateTemplate(id: string, dto: Partial<CreateTemplateDto>) {
    await this.findTemplate(id);
    return this.prisma.classTemplate.update({ where: { id }, data: dto });
  }

  async deleteTemplate(id: string) {
    await this.findTemplate(id);
    await this.prisma.classTemplate.delete({ where: { id } });
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

  findSessions(from?: string, to?: string) {
    return this.prisma.classSession.findMany({
      where: {
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

  /** Fiche cours pour l'app : la session + les URLs de la galerie du type de cours. */
  async findSessionDetail(id: string) {
    const session = await this.findSession(id);
    return { ...session, classType: await this.withGalleryUrls(session.classType) };
  }

  async findSession(id: string) {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
      include: {
        classType: true,
        room: true,
        coach: { include: { user: true } },
        _count: { select: { bookings: { where: { status: { in: ['CONFIRMED', 'ATTENDED'] } } } } },
      },
    });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');
    return session;
  }

  /** Cours du coach, avec le nombre de présents (pointés) par cours pour l'accueil coach. */
  async findSessionsForCoach(coachId: string, from?: string, to?: string) {
    const sessions = await this.prisma.classSession.findMany({
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
    const attended = await this.prisma.booking.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessions.map((s) => s.id) }, status: 'ATTENDED' },
      _count: { _all: true },
    });
    const byId = new Map(attended.map((g) => [g.sessionId, g._count._all]));
    return sessions.map((s) => ({ ...s, attendedCount: byId.get(s.id) ?? 0 }));
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
        oldValue: { coachId: session.coachId },
        newValue: { coachId },
      },
    });

    return updated;
  }

  createRoom(dto: CreateRoomDto) {
    return this.prisma.room.create({ data: dto });
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    await this.findRoom(id);
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async deleteRoom(id: string) {
    await this.findRoom(id);
    const used =
      (await this.prisma.classSession.count({ where: { roomId: id } })) + (await this.prisma.classTemplate.count({ where: { roomId: id } }));
    if (used > 0) throw new BadRequestException('ROOM_IN_USE');
    await this.prisma.room.delete({ where: { id } });
    return { deleted: true };
  }

  private async findRoom(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    return room;
  }

  /** Suppression d'un type de cours : définitive s'il n'est jamais utilisé, sinon désactivation. */
  async deleteType(id: string) {
    await this.findType(id);
    const used =
      (await this.prisma.classSession.count({ where: { classTypeId: id } })) + (await this.prisma.classTemplate.count({ where: { classTypeId: id } }));
    if (used > 0) {
      await this.prisma.classType.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.classType.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  listRooms() {
    return this.prisma.room.findMany({ orderBy: { name: 'asc' } });
  }

  /** Création d'un cours ponctuel. */
  async createSession(dto: CreateSessionDto, actorId: string) {
    const type = await this.findType(dto.classTypeId);
    const startsAt = new Date(dto.startsAt);
    const durationMin = dto.durationMin ?? type.defaultDurationMin;
    const session = await this.prisma.classSession.create({
      data: {
        classTypeId: type.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + durationMin * 60_000),
        coachId: dto.coachId ?? null,
        roomId: dto.roomId ?? null,
        capacity: dto.capacity ?? type.defaultCapacity,
      },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'CREATE_SESSION', entity: 'ClassSession', entityId: session.id, newValue: { classTypeId: type.id, startsAt: dto.startsAt } },
    });
    return session;
  }

  /** Modification d'un cours (horaire, type, coach, salle, capacité). */
  async updateSession(id: string, dto: UpdateSessionDto, actorId: string) {
    const session = await this.findSession(id);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : session.startsAt;
    const durationMs = dto.durationMin ? dto.durationMin * 60_000 : session.endsAt.getTime() - session.startsAt.getTime();
    if (dto.classTypeId) await this.findType(dto.classTypeId);
    if (dto.capacity !== undefined && dto.capacity < session._count.bookings) {
      throw new BadRequestException('CAPACITY_BELOW_BOOKINGS');
    }
    const updated = await this.prisma.classSession.update({
      where: { id },
      data: {
        ...(dto.classTypeId ? { classTypeId: dto.classTypeId } : {}),
        startsAt,
        endsAt: new Date(startsAt.getTime() + durationMs),
        ...(dto.coachId !== undefined ? { coachId: dto.coachId } : {}),
        ...(dto.roomId !== undefined ? { roomId: dto.roomId } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'UPDATE_SESSION', entity: 'ClassSession', entityId: id, newValue: dto as object },
    });
    return updated;
  }

  /** Suppression : définitive sans réservation, sinon annulation (les inscrits sont libérés). */
  async deleteSession(id: string, actorId: string) {
    const session = await this.findSession(id);
    const bookings = await this.prisma.booking.count({ where: { sessionId: id } });
    if (bookings > 0) return this.cancelSession(id, 'Cours supprimé', actorId);
    await this.prisma.classSession.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'DELETE_SESSION', entity: 'ClassSession', entityId: id, oldValue: { startsAt: session.startsAt } },
    });
    return { deleted: true };
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
