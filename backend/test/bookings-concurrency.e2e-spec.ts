import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module.js';
import { BookingsService } from '../src/bookings/bookings.service.js';

/**
 * Test d'intégration contre une vraie base Postgres (nécessite l'infra
 * docker-compose de dev démarrée — voir docker-compose.yml à la racine).
 * Valide la garantie de capacité sous concurrence et la promotion
 * automatique de la liste d'attente (section 12 du document de conception).
 */
describe('BookingsService — concurrence et liste d\'attente (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let bookingsService: BookingsService;

  let planId: string;
  let sessionId: string;
  let userIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = new PrismaClient();
    bookingsService = app.get(BookingsService);

    const classType = await prisma.classType.create({ data: { name: 'Test Class Concurrency' } });

    const plan = await prisma.membershipPlan.create({
      data: { name: 'Test Plan Concurrency', durationDays: 30, price: 50 },
    });
    planId = plan.id;

    const session = await prisma.classSession.create({
      data: {
        classTypeId: classType.id,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 3_600_000),
        capacity: 2, // capacité volontairement petite pour forcer la liste d'attente
      },
    });
    sessionId = session.id;

    // 4 adhérents actifs avec abonnement, pour réserver en concurrence sur
    // une séance de capacité 2 : 2 doivent être confirmés, 2 en attente.
    for (let i = 0; i < 4; i++) {
      const user = await prisma.user.create({
        data: {
          email: `concurrency-test-${i}-${Date.now()}@muscleup.dev`,
          passwordHash: 'x',
          firstName: `Test${i}`,
          lastName: 'Concurrency',
          roles: { create: { role: 'MEMBER' } },
        },
      });
      await prisma.membership.create({
        data: {
          userId: user.id,
          planId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 86_400_000),
          status: 'ACTIVE',
        },
      });
      userIds.push(user.id);
    }
  });

  afterAll(async () => {
    // Nettoyage dans l'ordre des contraintes de clé étrangère.
    await prisma.booking.deleteMany({ where: { sessionId } });
    await prisma.membership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.classSession.deleteMany({ where: { id: sessionId } });
    await prisma.membershipPlan.deleteMany({ where: { id: planId } });
    await prisma.classType.deleteMany({ where: { name: 'Test Class Concurrency' } });
    await prisma.$disconnect();
    await app.close();
  });

  it('ne dépasse jamais la capacité malgré des réservations simultanées', async () => {
    const results = await Promise.allSettled(
      userIds.map((userId) => bookingsService.create(userId, sessionId)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    expect(succeeded).toHaveLength(4); // les 4 réussissent (2 confirmées + 2 en attente), aucune erreur

    const confirmed = succeeded.filter((r) => r.value.status === 'CONFIRMED');
    const waitlisted = succeeded.filter((r) => r.value.status === 'WAITLISTED');

    expect(confirmed).toHaveLength(2); // jamais plus que la capacité
    expect(waitlisted).toHaveLength(2);

    const positions = waitlisted.map((r) => r.value.waitlistPosition).sort();
    expect(positions).toEqual([1, 2]); // positions distinctes et séquentielles
  });

  it('promeut automatiquement le premier de la liste d\'attente à l\'annulation', async () => {
    const bookingsBefore = await prisma.booking.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } });
    const confirmedBooking = bookingsBefore.find((b) => b.status === 'CONFIRMED')!;
    const firstWaitlisted = bookingsBefore.find((b) => b.waitlistPosition === 1)!;

    await bookingsService.cancel(confirmedBooking.userId, confirmedBooking.id);

    const promoted = await prisma.booking.findUnique({ where: { id: firstWaitlisted.id } });
    expect(promoted?.status).toBe('CONFIRMED');
    expect(promoted?.waitlistPosition).toBeNull();

    // Le second en liste d'attente doit avoir été resséquencé en position 1.
    const remainingWaitlisted = await prisma.booking.findMany({
      where: { sessionId, status: 'WAITLISTED' },
    });
    expect(remainingWaitlisted).toHaveLength(1);
    expect(remainingWaitlisted[0].waitlistPosition).toBe(1);
  });
});
