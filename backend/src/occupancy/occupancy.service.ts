import { BadRequestException, Injectable } from '@nestjs/common';
import type { OccupancyEstimate, OccupancyPolicy } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { isValidPublicIpEntry, parsePublicIpEntries } from './client-ip.js';
import { readOccupancyPolicy, weightedEstimate } from './occupancy-policy.js';
import { PresenceTrackerService } from './presence-tracker.service.js';
import type { UpdateOccupancyPolicyDto } from './dto/update-occupancy-policy.dto.js';

const MINUTE = 60_000;

/**
 * Estimation de l'occupation de la salle, sans tourniquet ni capteur physique.
 *
 * ⚠️ Le chiffre produit est une APPROXIMATION statistique (adhérents vus sur le WiFi de la salle +
 * fraction des adhérents ayant ouvert l'app ailleurs). Il ne doit jamais être présenté comme un
 * comptage exact dans l'interface : toujours « Estimation ≈ N personnes ».
 *
 * Déploiement mono-site : un seul site par instance, donc pas de branchId.
 */
@Injectable()
export class OccupancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracker: PresenceTrackerService,
  ) {}

  async getPolicy(): Promise<{ policy: OccupancyPolicy; publicIp: string | null; publicIpUpdatedAt: Date | null }> {
    const settings = await this.prisma.organizationSettings.findFirst({
      select: { occupancyPolicy: true, publicIp: true, publicIpUpdatedAt: true },
    });
    return {
      policy: readOccupancyPolicy(settings?.occupancyPolicy),
      publicIp: settings?.publicIp ?? null,
      publicIpUpdatedAt: settings?.publicIpUpdatedAt ?? null,
    };
  }

  async estimate(now = new Date()): Promise<OccupancyEstimate> {
    const { policy, publicIp } = await this.getPolicy();
    const publicIpConfigured = parsePublicIpEntries(publicIp).length > 0;
    const cutoff = new Date(now.getTime() - policy.presenceWindowMinutes * MINUTE);

    // Signal fort : vus sur le WiFi de la salle dans la fenêtre. Sans IP configurée, toujours 0.
    // Signal faible : vus sur un autre réseau uniquement (pas déjà comptés côté WiFi).
    const [wifiCount, otherNetworkCount, override] = await Promise.all([
      publicIpConfigured
        ? this.prisma.userPresenceSignal.count({ where: { lastSeenWifiAt: { gte: cutoff } } })
        : Promise.resolve(0),
      this.prisma.userPresenceSignal.count({
        where: publicIpConfigured
          ? {
              lastSeenAnyNetworkAt: { gte: cutoff },
              OR: [{ lastSeenWifiAt: null }, { lastSeenWifiAt: { lt: cutoff } }],
            }
          : { lastSeenAnyNetworkAt: { gte: cutoff } },
      }),
      this.prisma.occupancyOverride.findFirst({
        where: { clearedAt: null },
        orderBy: { setAt: 'desc' },
        include: { setBy: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    const base = { wifiCount, otherNetworkCount, publicIpConfigured, lastUpdatedAt: now.toISOString() };

    // Un réglage manuel actif prime ; expiré, il est ignoré (l'expiration est vérifiée ici, pas seulement en base).
    if (override && override.expiresAt.getTime() > now.getTime()) {
      return {
        ...base,
        estimate: override.manualCount,
        source: 'MANUAL',
        lastUpdatedAt: override.setAt.toISOString(),
        override: {
          count: override.manualCount,
          setBy: override.setBy ?? null,
          note: override.note ?? null,
          setAt: override.setAt.toISOString(),
          expiresAt: override.expiresAt.toISOString(),
        },
      };
    }

    return { ...base, estimate: weightedEstimate(wifiCount, otherNetworkCount, policy), source: 'AUTO' };
  }

  /** Vue adhérent : seulement le chiffre, sans le détail des signaux. */
  async memberEstimate(now = new Date()): Promise<Pick<OccupancyEstimate, 'estimate' | 'lastUpdatedAt'> | null> {
    const { policy } = await this.getPolicy();
    if (!policy.visibleToMembers) return null;
    const { estimate, lastUpdatedAt } = await this.estimate(now);
    return { estimate, lastUpdatedAt };
  }

  /**
   * Crée (ou remplace) le réglage manuel. Il expire toujours : durée par défaut de la politique,
   * bornée par `manualOverrideMaxDurationMinutes` (« jusqu'à nouvel ordre » = durée maximale).
   */
  async setManualOverride(count: number, userId: string, durationMinutes?: number, note?: string, now = new Date()) {
    const { policy } = await this.getPolicy();
    const minutes = Math.min(
      Math.max(1, durationMinutes ?? policy.manualOverrideDefaultDurationMinutes),
      policy.manualOverrideMaxDurationMinutes,
    );
    const expiresAt = new Date(now.getTime() + minutes * MINUTE);
    const cleanNote = note?.trim() || null;

    await this.prisma.$transaction(async (tx) => {
      await tx.occupancyOverride.updateMany({
        where: { clearedAt: null, expiresAt: { gt: now } },
        data: { clearedAt: now, clearedById: userId },
      });
      const created = await tx.occupancyOverride.create({
        data: { manualCount: count, setById: userId, setAt: now, expiresAt, note: cleanNote },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'SET_OCCUPANCY_OVERRIDE',
          entity: 'OccupancyOverride',
          entityId: created.id,
          newValue: { count, durationMinutes: minutes, expiresAt: expiresAt.toISOString(), note: cleanNote },
        },
      });
    });

    return this.estimate(now);
  }

  /** Repasse en calcul automatique avant l'expiration naturelle du réglage manuel. */
  async clearManualOverride(userId: string, now = new Date()) {
    const active = await this.prisma.occupancyOverride.findMany({
      where: { clearedAt: null, expiresAt: { gt: now } },
      select: { id: true, manualCount: true },
    });
    if (active.length > 0) {
      await this.prisma.$transaction([
        this.prisma.occupancyOverride.updateMany({
          where: { id: { in: active.map((o) => o.id) } },
          data: { clearedAt: now, clearedById: userId },
        }),
        ...active.map((o) =>
          this.prisma.auditLog.create({
            data: {
              actorId: userId,
              action: 'CLEAR_OCCUPANCY_OVERRIDE',
              entity: 'OccupancyOverride',
              entityId: o.id,
              oldValue: { count: o.manualCount },
            },
          }),
        ),
      ]);
    }
    return this.estimate(now);
  }

  async updatePolicy(dto: UpdateOccupancyPolicyDto, userId: string) {
    const { publicIp: rawIp, ...rest } = dto;
    const policy = readOccupancyPolicy(rest);
    if (policy.manualOverrideDefaultDurationMinutes > policy.manualOverrideMaxDurationMinutes) {
      throw new BadRequestException('OVERRIDE_DEFAULT_EXCEEDS_MAX');
    }

    const settings = await this.prisma.organizationSettings.findFirst();
    if (!settings) throw new BadRequestException('SETTINGS_NOT_INITIALIZED');

    const data: Record<string, unknown> = { occupancyPolicy: policy, version: { increment: 1 }, updatedBy: userId };
    let ipChanged = false;
    if (rawIp !== undefined) {
      const entries = parsePublicIpEntries(rawIp);
      if (entries.some((e) => !isValidPublicIpEntry(e))) throw new BadRequestException('INVALID_PUBLIC_IP');
      const publicIp = entries.length > 0 ? entries.join(', ') : null;
      if (publicIp !== settings.publicIp) {
        data.publicIp = publicIp;
        data.publicIpUpdatedAt = new Date();
        ipChanged = true;
      }
    }

    await this.prisma.organizationSettings.update({ where: { id: settings.id }, data });
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'UPDATE_OCCUPANCY_POLICY',
        entity: 'OrganizationSettings',
        entityId: settings.id,
        oldValue: { policy: settings.occupancyPolicy, publicIp: settings.publicIp } as object,
        newValue: { policy, publicIp: ipChanged ? data.publicIp : settings.publicIp } as object,
      },
    });
    if (ipChanged) this.tracker.invalidateNetwork();

    return this.getPolicy();
  }

  /** Purge des signaux trop anciens (plus utiles au calcul). */
  async purgeStaleSignals(olderThanDays = 7, now = new Date()) {
    const cutoff = new Date(now.getTime() - olderThanDays * 24 * 60 * MINUTE);
    const { count } = await this.prisma.userPresenceSignal.deleteMany({ where: { lastSeenAnyNetworkAt: { lt: cutoff } } });
    return count;
  }

  /** Photo horaire de l'estimation (alimente un futur graphique de fréquentation). */
  async snapshot(now = new Date()) {
    const e = await this.estimate(now);
    await this.prisma.occupancySnapshot.create({
      data: { takenAt: now, estimate: e.estimate, source: e.source, wifiCount: e.wifiCount, otherNetworkCount: e.otherNetworkCount },
    });
    return e;
  }
}
