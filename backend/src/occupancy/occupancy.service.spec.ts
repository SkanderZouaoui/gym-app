import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_OCCUPANCY_POLICY } from '@muscleup/shared';
import { OccupancyService } from './occupancy.service.js';

const NOW = new Date('2026-11-02T18:00:00Z');
const MIN = 60_000;

describe('OccupancyService.estimate', () => {
  let prisma: any;
  let service: OccupancyService;
  let wifi: number;
  let other: number;
  let override: any;
  let publicIp: string | null;

  beforeEach(() => {
    wifi = 0;
    other = 0;
    override = null;
    publicIp = '203.0.113.7';
    prisma = {
      organizationSettings: {
        findFirst: vi.fn(async () => ({ occupancyPolicy: {}, publicIp, publicIpUpdatedAt: null })),
      },
      userPresenceSignal: {
        // Requête WiFi : filtre sur lastSeenWifiAt seul ; requête « autre réseau » : filtre sur lastSeenAnyNetworkAt.
        count: vi.fn(async ({ where }: any) => ('lastSeenAnyNetworkAt' in where ? other : wifi)),
      },
      occupancyOverride: { findFirst: vi.fn(async () => override) },
    };
    service = new OccupancyService(prisma, { invalidateNetwork: vi.fn() } as any);
  });

  it('sans aucun signal : estimation 0, source AUTO', async () => {
    const e = await service.estimate(NOW);
    expect(e).toMatchObject({ estimate: 0, source: 'AUTO', wifiCount: 0, otherNetworkCount: 0, publicIpConfigured: true });
    expect(e.override).toBeUndefined();
  });

  it('seulement WiFi : chaque adhérent compte pour wifiWeight (1.0)', async () => {
    wifi = 12;
    const e = await service.estimate(NOW);
    expect(e).toMatchObject({ estimate: 12, source: 'AUTO', wifiCount: 12, otherNetworkCount: 0 });
  });

  it('seulement autre réseau : pondéré à 0.3 et arrondi', async () => {
    other = 10;
    const e = await service.estimate(NOW);
    expect(e).toMatchObject({ estimate: 3, source: 'AUTO', wifiCount: 0, otherNetworkCount: 10 });
  });

  it('combiné : 1.0 × WiFi + 0.3 × autre réseau', async () => {
    wifi = 15;
    other = 9; // 15 + 2.7 = 17.7 → 18
    const e = await service.estimate(NOW);
    expect(e).toMatchObject({ estimate: 18, source: 'AUTO', wifiCount: 15, otherNetworkCount: 9 });
  });

  it('respecte les poids et la fenêtre configurés', async () => {
    prisma.organizationSettings.findFirst.mockResolvedValue({
      occupancyPolicy: { ...DEFAULT_OCCUPANCY_POLICY, wifiWeight: 0.8, otherNetworkWeight: 0.5, presenceWindowMinutes: 10 },
      publicIp,
    });
    wifi = 10;
    other = 4; // 8 + 2 = 10
    const e = await service.estimate(NOW);
    expect(e.estimate).toBe(10);
    const cutoff = prisma.userPresenceSignal.count.mock.calls[0][0].where.lastSeenWifiAt.gte as Date;
    expect(NOW.getTime() - cutoff.getTime()).toBe(10 * MIN);
  });

  it("sans IP publique configurée : WiFi toujours à 0, seul l'autre réseau pondéré compte", async () => {
    publicIp = null;
    wifi = 50; // ignoré : pas de requête WiFi
    other = 20;
    const e = await service.estimate(NOW);
    expect(e).toMatchObject({ estimate: 6, wifiCount: 0, otherNetworkCount: 20, publicIpConfigured: false });
    expect(prisma.userPresenceSignal.count).toHaveBeenCalledTimes(1);
  });

  it('override actif : le chiffre manuel prime, source MANUAL', async () => {
    wifi = 15;
    override = {
      manualCount: 42,
      note: 'Compétition',
      setAt: new Date(NOW.getTime() - 5 * MIN),
      expiresAt: new Date(NOW.getTime() + 25 * MIN),
      setBy: { id: 'staff-1', firstName: 'Nour', lastName: 'Accueil' },
    };
    const e = await service.estimate(NOW);
    expect(e).toMatchObject({ estimate: 42, source: 'MANUAL', wifiCount: 15 });
    expect(e.override).toMatchObject({ count: 42, note: 'Compétition', setBy: { id: 'staff-1' } });
  });

  it('override expiré : ignoré, retour au calcul automatique', async () => {
    wifi = 7;
    override = {
      manualCount: 42,
      note: null,
      setAt: new Date(NOW.getTime() - 60 * MIN),
      expiresAt: new Date(NOW.getTime() - 1),
      setBy: null,
    };
    const e = await service.estimate(NOW);
    expect(e).toMatchObject({ estimate: 7, source: 'AUTO' });
    expect(e.override).toBeUndefined();
  });
});

describe('OccupancyService.setManualOverride', () => {
  it("borne la durée à la durée maximale (l'override expire toujours)", async () => {
    const tx = {
      occupancyOverride: { updateMany: vi.fn(), create: vi.fn(async ({ data }: any) => ({ id: 'o1', ...data })) },
      auditLog: { create: vi.fn() },
    };
    const prisma: any = {
      organizationSettings: { findFirst: vi.fn(async () => ({ occupancyPolicy: {}, publicIp: null })) },
      userPresenceSignal: { count: vi.fn(async () => 0) },
      occupancyOverride: { findFirst: vi.fn(async () => null) },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    };
    const service = new OccupancyService(prisma, { invalidateNetwork: vi.fn() } as any);
    await service.setManualOverride(20, 'admin-1', 100_000, '  ', NOW);
    const data = tx.occupancyOverride.create.mock.calls[0][0].data;
    expect(data.expiresAt.getTime() - NOW.getTime()).toBe(DEFAULT_OCCUPANCY_POLICY.manualOverrideMaxDurationMinutes * MIN);
    expect(data.note).toBeNull();
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'SET_OCCUPANCY_OVERRIDE' }) }));
  });
});
