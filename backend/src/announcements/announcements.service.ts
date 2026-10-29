import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException } from '@nestjs/common';
import type { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto.js';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  /**
   * Aperçu des destinataires avant envoi (section 4.4/4.5 : "aperçu de la
   * notification"). Ne crée rien, se contente de compter.
   */
  async previewRecipients(dto: CreateAnnouncementDto) {
    const count = await this.prisma.user.count({ where: this.targetFilter(dto) });
    return { recipientCount: count };
  }

  /** Envoi : crée une Announcement et une Notification in-app par destinataire ciblé. */
  async send(dto: CreateAnnouncementDto, actorId: string) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.body,
        planId: dto.planId,
        tone: dto.tone ?? 'info',
        startsOn: dto.startsOn ? new Date(dto.startsOn) : null,
        endsOn: dto.endsOn ? new Date(dto.endsOn) : null,
        push: dto.push ?? true,
        createdById: actorId,
        sentAt: new Date(),
      },
    });

    const recipients = await this.prisma.user.findMany({
      where: this.targetFilter(dto),
      select: { id: true },
    });

    if ((dto.push ?? true) && recipients.length > 0) {
      await this.prisma.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          type: 'ANNOUNCEMENT' as const,
          title: dto.title,
          body: dto.body,
          data: { announcementId: announcement.id },
        })),
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'SEND_ANNOUNCEMENT',
        entity: 'Announcement',
        entityId: announcement.id,
        newValue: { recipientCount: recipients.length },
      },
    });

    return { announcement, recipientCount: recipients.length };
  }

  /** Modification d'une annonce (texte, période d'affichage) — les notifications déjà envoyées restent telles quelles. */
  async update(id: string, dto: UpdateAnnouncementDto, actorId: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('ANNOUNCEMENT_NOT_FOUND');
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.startsOn !== undefined ? { startsOn: dto.startsOn ? new Date(dto.startsOn) : null } : {}),
        ...(dto.endsOn !== undefined ? { endsOn: dto.endsOn ? new Date(dto.endsOn) : null } : {}),
      },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'UPDATE_ANNOUNCEMENT', entity: 'Announcement', entityId: id, newValue: dto as object },
    });
    return updated;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('ANNOUNCEMENT_NOT_FOUND');
    await this.prisma.announcement.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'DELETE_ANNOUNCEMENT', entity: 'Announcement', entityId: id, oldValue: { title: existing.title } },
    });
    return { deleted: true };
  }

  /** Annonces envoyées reçues par l'adhérent courant — GET /v1/me/announcements. */
  async findForMember(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberships: { where: { status: 'ACTIVE' }, select: { planId: true } } },
    });
    if (!user) return [];

    const planIds = user.memberships.map((m) => m.planId);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.prisma.announcement.findMany({
      where: {
        sentAt: { not: null },
        AND: [
          { OR: [{ planId: null }, ...(planIds.length > 0 ? [{ planId: { in: planIds } }] : [])] },
          { OR: [{ startsOn: null }, { startsOn: { lte: today } }] },
          { OR: [{ endsOn: null }, { endsOn: { gte: today } }] },
        ],
      },
      orderBy: { sentAt: 'desc' },
      take: 20,
    });
  }

  private targetFilter(dto: CreateAnnouncementDto) {
    return {
      deletedAt: null,
      ...(dto.planId
        ? { memberships: { some: { planId: dto.planId, status: 'ACTIVE' as const } } }
        : {}),
    };
  }
}
