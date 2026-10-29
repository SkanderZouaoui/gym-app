import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '@prisma/client';

export type AudienceKey = string; // ALL | ACTIVE | EXPIRING | EXPIRED | PLAN:<id>
export type RuleCondition = 'NONE' | 'EXPIRES_7D' | 'ABSENT_14D' | 'CLASS_TOMORROW';

const DAY = 86_400_000;

/** Notifications composées par l'admin : envoi immédiat, programmé, et règles récurrentes. */
@Injectable()
export class NotificationCampaignsService {
  private readonly logger = new Logger(NotificationCampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- Audiences -------------------------------------------------------------

  private audienceWhere(audience: AudienceKey, now = new Date()): Prisma.UserWhereInput {
    const base: Prisma.UserWhereInput = { deletedAt: null, status: 'ACTIVE', roles: { some: { role: 'MEMBER' } } };
    const valid: Prisma.MembershipWhereInput = { status: 'ACTIVE', endDate: { gte: now } };
    if (audience === 'ACTIVE') return { ...base, memberships: { some: valid } };
    if (audience === 'EXPIRING') {
      return { ...base, memberships: { some: { status: 'ACTIVE', endDate: { gte: now, lte: new Date(now.getTime() + 7 * DAY) } } } };
    }
    if (audience === 'EXPIRED') return { ...base, memberships: { some: {}, none: valid } };
    if (audience.startsWith('PLAN:')) return { ...base, memberships: { some: { ...valid, planId: audience.slice(5) } } };
    return base;
  }

  private conditionWhere(condition: RuleCondition, now = new Date()): Prisma.UserWhereInput {
    if (condition === 'EXPIRES_7D') return this.audienceWhere('EXPIRING', now);
    if (condition === 'ABSENT_14D') {
      return {
        memberships: { some: { status: 'ACTIVE', endDate: { gte: now } } },
        bookings: { none: { status: 'ATTENDED', attendedAt: { gte: new Date(now.getTime() - 14 * DAY) } } },
      };
    }
    if (condition === 'CLASS_TOMORROW') {
      const start = new Date(now);
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + DAY);
      return { bookings: { some: { status: 'CONFIRMED', session: { startsAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } } } } };
    }
    return {};
  }

  private async recipients(audience: AudienceKey, condition: RuleCondition = 'NONE') {
    const users = await this.prisma.user.findMany({
      where: { AND: [this.audienceWhere(audience), this.conditionWhere(condition)] },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /** Audiences proposées (avec effectif) : tous, actifs, expirent bientôt, expirés, puis une par forfait. */
  async audiences() {
    const plans = await this.prisma.membershipPlan.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    const entries: { key: AudienceKey; label: string }[] = [
      { key: 'ALL', label: 'Tous les adhérents' },
      { key: 'ACTIVE', label: 'Actifs' },
      { key: 'EXPIRING', label: 'Expirent bientôt' },
      { key: 'EXPIRED', label: 'Expirés' },
      ...plans.map((p) => ({ key: `PLAN:${p.id}`, label: `Forfait ${p.name}` })),
    ];
    return Promise.all(entries.map(async (e) => ({ ...e, count: await this.prisma.user.count({ where: this.audienceWhere(e.key) }) })));
  }

  async conditionCounts() {
    const conds: RuleCondition[] = ['EXPIRES_7D', 'ABSENT_14D', 'CLASS_TOMORROW'];
    const out: Record<string, number> = { NONE: 0 };
    for (const c of conds) out[c] = await this.prisma.user.count({ where: this.conditionWhere(c) });
    return out;
  }

  // --- Livraison -------------------------------------------------------------

  private async deliver(input: { title: string; body: string; audience: AudienceKey; condition?: RuleCondition; ref: Record<string, string> }) {
    const ids = await this.recipients(input.audience, input.condition ?? 'NONE');
    if (ids.length > 0) {
      await this.prisma.notification.createMany({
        data: ids.map((userId) => ({ userId, type: 'ANNOUNCEMENT' as const, title: input.title, body: input.body, data: input.ref })),
      });
    }
    return ids.length;
  }

  // --- Notifications (immédiates / programmées) ------------------------------

  async create(
    dto: { kind: string; title: string; body: string; audience: AudienceKey; sendAt?: string },
    actorId: string,
  ) {
    const later = dto.sendAt && new Date(dto.sendAt).getTime() > Date.now() + 30_000;
    const row = await this.prisma.scheduledNotification.create({
      data: {
        kind: dto.kind,
        title: dto.title,
        body: dto.body,
        audience: dto.audience,
        sendAt: later ? new Date(dto.sendAt!) : new Date(),
        status: 'PENDING',
        createdById: actorId,
      },
    });
    return later ? row : this.send(row.id);
  }

  private async send(id: string) {
    const row = await this.prisma.scheduledNotification.findUnique({ where: { id } });
    if (!row || row.status !== 'PENDING') throw new NotFoundException('NOTIFICATION_NOT_PENDING');
    // Réservation atomique : évite un double envoi si deux passes du cron se chevauchent.
    const claimed = await this.prisma.scheduledNotification.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'SENT', sentAt: new Date() } });
    if (claimed.count === 0) return row;
    const count = await this.deliver({ title: row.title, body: row.body, audience: row.audience, ref: { scheduledId: id } });
    return this.prisma.scheduledNotification.update({ where: { id }, data: { sentCount: count } });
  }

  listScheduled() {
    return this.prisma.scheduledNotification.findMany({ where: { status: 'PENDING' }, orderBy: { sendAt: 'asc' } });
  }

  async history() {
    const rows = await this.prisma.scheduledNotification.findMany({ where: { status: 'SENT' }, orderBy: { sentAt: 'desc' }, take: 50 });
    return Promise.all(
      rows.map(async (r) => {
        const opened = await this.prisma.notification.count({ where: { data: { path: ['scheduledId'], equals: r.id }, readAt: { not: null } } });
        return { ...r, openedCount: opened, openRate: r.sentCount > 0 ? Math.round((opened / r.sentCount) * 100) : 0 };
      }),
    );
  }

  async cancel(id: string) {
    const res = await this.prisma.scheduledNotification.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (res.count === 0) throw new NotFoundException('NOTIFICATION_NOT_PENDING');
    return { cancelled: true };
  }

  // --- Règles récurrentes ----------------------------------------------------

  listRules() {
    return this.prisma.notificationRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createRule(dto: { title: string; body: string; audience: AudienceKey; condition: RuleCondition; days: number[]; time: string }, actorId: string) {
    return this.prisma.notificationRule.create({ data: { ...dto, createdById: actorId } });
  }

  async toggleRule(id: string, isActive: boolean) {
    const rule = await this.prisma.notificationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('RULE_NOT_FOUND');
    return this.prisma.notificationRule.update({ where: { id }, data: { isActive } });
  }

  async deleteRule(id: string) {
    const rule = await this.prisma.notificationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('RULE_NOT_FOUND');
    await this.prisma.notificationRule.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Planificateur ---------------------------------------------------------

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    const now = new Date();
    const due = await this.prisma.scheduledNotification.findMany({ where: { status: 'PENDING', sendAt: { lte: now } }, select: { id: true } });
    for (const d of due) await this.send(d.id).catch((e) => this.logger.error(`Envoi ${d.id} : ${e}`));

    const weekday = (now.getDay() + 6) % 7; // 0 = lundi
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const rules = await this.prisma.notificationRule.findMany({ where: { isActive: true, days: { has: weekday }, time: { lte: hhmm } } });
    for (const rule of rules) {
      if (rule.lastRunOn && rule.lastRunOn.getTime() >= today.getTime()) continue;
      const claimed = await this.prisma.notificationRule.updateMany({
        where: { id: rule.id, OR: [{ lastRunOn: null }, { lastRunOn: { lt: today } }] },
        data: { lastRunOn: today },
      });
      if (claimed.count === 0) continue;
      const count = await this.deliver({
        title: rule.title,
        body: rule.body,
        audience: rule.audience,
        condition: rule.condition as RuleCondition,
        ref: { ruleId: rule.id },
      });
      this.logger.log(`Règle « ${rule.title} » : ${count} envoi(s)`);
    }
  }
}
