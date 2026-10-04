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
