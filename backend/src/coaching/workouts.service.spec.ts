import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkoutsService } from './workouts.service.js';

describe('WorkoutsService — détection de record personnel', () => {
  let prisma: any;
  let service: WorkoutsService;

  beforeEach(() => {
    prisma = {
      workoutSet: { groupBy: vi.fn().mockResolvedValue([]) },
      workoutLog: { create: vi.fn() },
      user: { findUnique: vi.fn().mockResolvedValue({ firstName: 'Sarra', lastName: 'Ben Ali' }) },
      coachingSession: { findMany: vi.fn().mockResolvedValue([]) },
      notification: { create: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
    };
    service = new WorkoutsService(prisma);
  });

  const makeLog = (weightKg: number | null) => ({
    id: 'log-1',
    sets: [{ exerciseId: 'ex-1', weightKg, exercise: { name: 'Développé couché' } }],
  });

  it("ne notifie rien au tout premier passage sur un exercice (pas de record à battre)", async () => {
    prisma.workoutSet.groupBy.mockResolvedValue([]); // aucun historique
    prisma.workoutLog.create.mockResolvedValue(makeLog(60));

    await service.create('user-1', { sets: [{ exerciseId: 'ex-1', setNumber: 1, weightKg: 60 }] } as any);

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('notifie l’adhérent quand le poids dépasse le record précédent', async () => {
    prisma.workoutSet.groupBy.mockResolvedValue([{ exerciseId: 'ex-1', _max: { weightKg: 65 } }]);
    prisma.workoutLog.create.mockResolvedValue(makeLog(70));

    await service.create('user-1', { sets: [{ exerciseId: 'ex-1', setNumber: 1, weightKg: 70 }] } as any);

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', type: 'PERSONAL_RECORD' }),
      }),
    );
  });

  it('ne notifie pas si le poids est égal ou inférieur au record précédent', async () => {
    prisma.workoutSet.groupBy.mockResolvedValue([{ exerciseId: 'ex-1', _max: { weightKg: 70 } }]);
    prisma.workoutLog.create.mockResolvedValue(makeLog(70));

    await service.create('user-1', { sets: [{ exerciseId: 'ex-1', setNumber: 1, weightKg: 70 }] } as any);

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('notifie aussi les coachs actifs de l’élève', async () => {
    prisma.workoutSet.groupBy.mockResolvedValue([{ exerciseId: 'ex-1', _max: { weightKg: 65 } }]);
    prisma.workoutLog.create.mockResolvedValue(makeLog(70));
    prisma.coachingSession.findMany.mockResolvedValue([{ coachId: 'coach-1' }]);

    await service.create('user-1', { sets: [{ exerciseId: 'ex-1', setNumber: 1, weightKg: 70 }] } as any);

    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ userId: 'coach-1', type: 'PERSONAL_RECORD' })],
      }),
    );
  });
});
