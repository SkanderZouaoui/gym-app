import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

const MIN = 60_000;
const DAY = 86_400_000;

export interface NotificationPrefs {
  expiryAlert: boolean;
  classReminder: boolean;
}

/** Préférences par défaut : tout est activé tant que l'adhérent n'a rien décidé. */
export function readPrefs(raw: unknown): NotificationPrefs {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return { expiryAlert: o.expiryAlert !== false, classReminder: o.classReminder !== false };
}

/**
 * Rappels automatiques de l'adhérent : fin d'abonnement dans 7 jours, cours réservé dans l'heure.
 * Les notifications créées ici partent ensuite en push via PushService. Chaque rappel n'est créé qu'une fois
 * (repéré par l'identifiant de l'abonnement ou de la réservation dans `data`).
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(private readonly prisma: PrismaService) {}

  getPrefs(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { notificationPrefs: true } }).then((u) => readPrefs(u.notificationPrefs));
  }

  async updatePrefs(userId: string, patch: Partial<NotificationPrefs>) {
    const next = { ...(await this.getPrefs(userId)), ...patch };
    await this.prisma.user.update({ where: { id: userId }, data: { notificationPrefs: next } });
    return next;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async tick() {
    try {
      await this.membershipExpiring();
      await this.classStarting();
    } catch (e) {
      this.logger.error(`Rappels : ${e}`);
    }
  }

  private async membershipExpiring() {
    const now = new Date();
    const rows = await this.prisma.membership.findMany({
      where: { status: 'ACTIVE', endDate: { gte: now, lte: new Date(now.getTime() + 7 * DAY) }, user: { status: 'ACTIVE', deletedAt: null, roles: { some: { role: 'MEMBER' } } } },
      include: { user: { select: { id: true, notificationPrefs: true } }, plan: { select: { name: true } } },
    });
    for (const m of rows) {
      if (!readPrefs(m.user.notificationPrefs).expiryAlert) continue;
      const done = await this.prisma.notification.count({ where: { userId: m.userId, type: 'MEMBERSHIP_EXPIRING', data: { path: ['membershipId'], equals: m.id } } });
      if (done > 0) continue;
      const days = Math.max(0, Math.ceil((m.endDate.getTime() - now.getTime()) / DAY));
      await this.prisma.notification.create({
        data: {
          userId: m.userId,
          type: 'MEMBERSHIP_EXPIRING',
          title: 'Votre abonnement arrive à échéance',
          body: days <= 1 ? `Votre abonnement ${m.plan.name} se termine demain.` : `Votre abonnement ${m.plan.name} se termine dans ${days} jours.`,
          data: { membershipId: m.id, endDate: m.endDate.toISOString() },
        },
      });
    }
  }

  private async classStarting() {
    const now = new Date();
    const rows = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        session: { status: { not: 'CANCELLED' }, startsAt: { gt: now, lte: new Date(now.getTime() + 60 * MIN) } },
        user: { status: 'ACTIVE', deletedAt: null },
      },
      include: { user: { select: { notificationPrefs: true } }, session: { select: { startsAt: true, classType: { select: { name: true } } } } },
    });
    for (const b of rows) {
      if (!readPrefs(b.user.notificationPrefs).classReminder) continue;
      const done = await this.prisma.notification.count({ where: { userId: b.userId, type: 'CLASS_REMINDER', data: { path: ['bookingId'], equals: b.id } } });
      if (done > 0) continue;
      const minutes = Math.max(1, Math.round((b.session.startsAt.getTime() - now.getTime()) / MIN));
      await this.prisma.notification.create({
        data: {
          userId: b.userId,
          type: 'CLASS_REMINDER',
          title: 'Votre cours commence bientôt',
          body: `${b.session.classType.name} commence dans ${minutes} min.`,
          data: { bookingId: b.id, sessionId: b.sessionId, startsAt: b.session.startsAt.toISOString() },
        },
      });
    }
  }
}
