import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
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
        branchId: dto.branchId,
        planId: dto.planId,
        createdById: actorId,
        sentAt: new Date(),
      },
    });

    const recipients = await this.prisma.user.findMany({
      where: this.targetFilter(dto),
      select: { id: true },
    });

    if (recipients.length > 0) {
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
        branchId: dto.branchId,
        newValue: { recipientCount: recipients.length },
      },
    });

    return { announcement, recipientCount: recipients.length };
  }

  /** Annonces envoyées reçues par l'adhérent courant — GET /v1/me/announcements. */
  async findForMember(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { homeBranchId: true, memberships: { where: { status: 'ACTIVE' }, select: { planId: true } } },
    });
    if (!user) return [];

    const planIds = user.memberships.map((m) => m.planId);

    return this.prisma.announcement.findMany({
      where: {
        sentAt: { not: null },
        OR: [
          { branchId: null, planId: null },
          ...(user.homeBranchId ? [{ branchId: user.homeBranchId, planId: null }] : []),
          ...(planIds.length > 0 ? [{ branchId: null, planId: { in: planIds } }] : []),
          ...(user.homeBranchId && planIds.length > 0
            ? [{ branchId: user.homeBranchId, planId: { in: planIds } }]
            : []),
        ],
      },
      orderBy: { sentAt: 'desc' },
      take: 20,
    });
  }

  private targetFilter(dto: CreateAnnouncementDto) {
    return {
      deletedAt: null,
      ...(dto.branchId ? { homeBranchId: dto.branchId } : {}),
      ...(dto.planId
        ? { memberships: { some: { planId: dto.planId, status: 'ACTIVE' as const } } }
        : {}),
    };
  }
}
