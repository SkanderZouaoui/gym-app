import { Injectable, Logger } from '@nestjs/common';
import type { BlockList } from 'node:net';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildVenueNetwork, isOnVenueNetwork } from './client-ip.js';

/** Écriture en base au plus une fois par minute et par adhérent (sauf changement de réseau). */
const WRITE_THROTTLE_MS = 60_000;
/** Durée de cache de l'IP publique de la salle (relue au plus une fois par minute). */
const NETWORK_CACHE_MS = 60_000;
const MAX_TRACKED_USERS = 20_000;

/**
 * Enregistre les signaux de présence (WiFi de la salle / app ouverte ailleurs) à partir des requêtes
 * authentifiées. Best-effort : n'attend jamais la base, avale toutes les erreurs — une requête normale
 * ne doit jamais être ralentie ni échouer à cause de ce suivi.
 */
@Injectable()
export class PresenceTrackerService {
  private readonly logger = new Logger(PresenceTrackerService.name);
  private readonly lastWrite = new Map<string, { at: number; wifi: boolean }>();
  private network: { value: BlockList | null; loadedAt: number } | null = null;
  private networkLoading: Promise<BlockList | null> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget : retourne immédiatement. */
  track(userId: string, ip: string | null): void {
    void this.record(userId, ip).catch((err: unknown) => {
      this.logger.debug(`Signal de présence ignoré : ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  /** À appeler quand l'IP publique de la salle change (réglages). */
  invalidateNetwork(): void {
    this.network = null;
    this.lastWrite.clear();
  }

  async record(userId: string, ip: string | null, now = new Date()): Promise<void> {
    const network = await this.venueNetwork(now.getTime());
    const wifi = isOnVenueNetwork(network, ip);

    const previous = this.lastWrite.get(userId);
    if (previous && previous.wifi === wifi && now.getTime() - previous.at < WRITE_THROTTLE_MS) return;
    if (this.lastWrite.size >= MAX_TRACKED_USERS) this.lastWrite.clear();
    this.lastWrite.set(userId, { at: now.getTime(), wifi });

    await this.prisma.userPresenceSignal.upsert({
      where: { userId },
      create: { userId, lastSeenAnyNetworkAt: now, lastSeenWifiAt: wifi ? now : null },
      update: wifi ? { lastSeenAnyNetworkAt: now, lastSeenWifiAt: now } : { lastSeenAnyNetworkAt: now },
    });
  }

  private async venueNetwork(nowMs: number): Promise<BlockList | null> {
    if (this.network && nowMs - this.network.loadedAt < NETWORK_CACHE_MS) return this.network.value;
    this.networkLoading ??= this.prisma.organizationSettings
      .findFirst({ select: { publicIp: true } })
      .then((s) => {
        const value = buildVenueNetwork(s?.publicIp);
        this.network = { value, loadedAt: Date.now() };
        return value;
      })
      .finally(() => {
        this.networkLoading = null;
      });
    return this.networkLoading;
  }
}
