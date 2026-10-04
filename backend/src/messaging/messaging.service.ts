import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SendMessageDto } from './dto/send-message.dto.js';

/**
 * Messagerie limitée aux échanges adhérent ↔ coach/staff/admin (section 18,
 * point ouvert 12 — tranché ici pour la V0 : pas de messagerie adhérent ↔
 * adhérent, par prudence vis-à-vis des risques de harcèlement/abus avant
 * d'avoir des outils de modération plus poussés).
 */
@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async startConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new BadRequestException('CANNOT_MESSAGE_SELF');

    const [userRoles, otherRoles] = await Promise.all([
      this.prisma.userBranchRole.findMany({ where: { userId } }),
      this.prisma.userBranchRole.findMany({ where: { userId: otherUserId } }),
    ]);

    const isPrivileged = (roles: { role: string }[]) =>
      roles.some((r) => r.role === Role.COACH || r.role === Role.STAFF || r.role === Role.ADMIN);

    if (!isPrivileged(userRoles) && !isPrivileged(otherRoles)) {
      throw new ForbiddenException('MESSAGING_RESTRICTED_TO_STAFF_OR_COACH');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        participants: { some: { userId } },
        AND: { participants: { some: { userId: otherUserId } } },
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        participants: { create: [{ userId }, { userId: otherUserId }] },
      },
    });
  }

  async findForUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, photoKey: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async getMessages(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(conversationId: string, senderId: string, dto: SendMessageDto) {
    await this.assertParticipant(conversationId, senderId);
    const message = await this.prisma.message.create({
      data: { conversationId, senderId, body: dto.body },
    });

    const recipients = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: senderId } },
    });
    if (recipients.length > 0) {
      await this.prisma.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.userId,
          type: 'MESSAGE' as const,
          title: 'Nouveau message',
          body: dto.body.slice(0, 100),
          data: { conversationId },
        })),
      });
    }

    return message;
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new NotFoundException('CONVERSATION_NOT_FOUND');
  }
}
