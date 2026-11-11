import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;
/** Au-delà, une notification trop ancienne n'est plus envoyée en push (le serveur était arrêté, par exemple). */
const MAX_AGE_MS = 60 * 60_000;

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/**
 * Envoie en push (Expo) les notifications enregistrées en base.
 * Un worker repère les lignes `notifications` jamais poussées : toutes les sources (annonces, campagnes, records,
 * alertes admin) sont couvertes sans modifier chaque appelant.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, token: string, platform: string) {
    // Un appareil appartient à un seul compte à la fois : le jeton change de propriétaire à la reconnexion.
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { token, userId, platform },
      update: { userId, platform },
    });
  }

  async unregister(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
  }

  @Cron('*/10 * * * * *')
  async flush() {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.prisma.notification.findMany({
        where: { pushedAt: null, createdAt: { gte: new Date(Date.now() - MAX_AGE_MS) } },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });
      if (pending.length === 0) return;

      // Réservation atomique : une seule instance envoie chaque notification.
      const claimed = await this.prisma.notification.updateMany({ where: { id: { in: pending.map((n) => n.id) }, pushedAt: null }, data: { pushedAt: new Date() } });
      if (claimed.count === 0) return;

      const tokens = await this.prisma.deviceToken.findMany({ where: { userId: { in: [...new Set(pending.map((n) => n.userId))] } } });
      const byUser = new Map<string, string[]>();
      for (const t of tokens) byUser.set(t.userId, [...(byUser.get(t.userId) ?? []), t.token]);

      const unread = await this.prisma.notification.groupBy({ by: ['userId'], where: { userId: { in: [...byUser.keys()] }, readAt: null }, _count: true });
      const badge = new Map(unread.map((u) => [u.userId, u._count]));

      const messages = pending.flatMap((n) =>
        (byUser.get(n.userId) ?? []).map((to) => ({
          to,
          title: n.title,
          body: n.body,
          sound: 'default',
          channelId: 'default',
          badge: badge.get(n.userId) ?? 1,
          data: { notificationId: n.id, type: n.type, ...(typeof n.data === 'object' && n.data ? n.data : {}) },
        })),
      );
      for (let i = 0; i < messages.length; i += CHUNK) await this.sendChunk(messages.slice(i, i + CHUNK));
    } catch (e) {
      this.logger.error(`Envoi push : ${e}`);
    } finally {
      this.running = false;
    }
  }

  private async sendChunk(chunk: { to: string }[]) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      this.logger.warn(`Expo push HTTP ${res.status}`);
      return;
    }
    const { data } = (await res.json()) as { data?: ExpoTicket[] };
    // Appareil désinstallé ou jeton révoqué : on l'oublie pour ne plus l'interroger.
    const dead = (data ?? []).flatMap((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? [chunk[i].to] : []));
    if (dead.length > 0) await this.prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
  }
}
