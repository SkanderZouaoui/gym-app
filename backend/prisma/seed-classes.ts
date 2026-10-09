import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Jeu de données de démo pour le Planning (cours collectifs sur 7 jours,
 * plusieurs types/salles/coachs) — à lancer séparément du seed d'exercices :
 *   npx tsx prisma/seed-classes.ts
 */
async function main() {
  const coach = await prisma.coachProfile.findFirst();

  const roomDefs = [
    { name: 'Studio 1', capacity: 20 },
    { name: 'Studio 2', capacity: 14 },
    { name: 'Salle de force', capacity: 16 },
  ];

  const rooms = await Promise.all(
    roomDefs.map(async (r) => {
      const existing = await prisma.room.findFirst({ where: { name: r.name } });
      if (existing) return existing;
      return prisma.room.create({ data: { name: r.name, capacity: r.capacity } });
    }),
  );

  const classTypeDefs = [
    { name: 'HIIT Express', description: 'Intervalles courts et intenses : cardio, gainage, poids du corps.', level: 'Intermédiaire' },
    { name: 'Cycling', description: 'Cours de vélo en salle, rythmé par la musique.', level: 'Tous niveaux' },
    { name: 'Pilates', description: 'Renforcement profond et mobilité, au sol.', level: 'Débutant' },
    { name: 'Yoga Flow', description: 'Enchaînements fluides, respiration et étirements.', level: 'Tous niveaux' },
    { name: 'Boxe', description: 'Travail technique et cardio sur sacs de frappe.', level: 'Avancé' },
  ];

  const classTypes = await Promise.all(
    classTypeDefs.map((c) =>
      prisma.classType.upsert({
        where: { id: c.name },
        update: {},
        create: { id: c.name, ...c },
      }),
    ),
  );

  // Grille hebdomadaire : jour (0=aujourd'hui .. 6), heure, type, salle, capacité
  const schedule: { dayOffset: number; hour: number; durationMin: number; classType: string; room: string; capacity: number }[] = [
    { dayOffset: 0, hour: 7, durationMin: 45, classType: 'Cycling', room: 'Studio 1', capacity: 20 },
    { dayOffset: 0, hour: 12, durationMin: 30, classType: 'HIIT Express', room: 'Salle de force', capacity: 16 },
    { dayOffset: 0, hour: 18, durationMin: 60, classType: 'Yoga Flow', room: 'Studio 2', capacity: 14 },
    { dayOffset: 1, hour: 9, durationMin: 45, classType: 'Pilates', room: 'Studio 2', capacity: 14 },
    { dayOffset: 1, hour: 18, durationMin: 60, classType: 'Boxe', room: 'Salle de force', capacity: 12 },
    { dayOffset: 2, hour: 7, durationMin: 45, classType: 'Cycling', room: 'Studio 1', capacity: 20 },
    { dayOffset: 2, hour: 12, durationMin: 30, classType: 'HIIT Express', room: 'Salle de force', capacity: 16 },
    { dayOffset: 3, hour: 9, durationMin: 45, classType: 'Pilates', room: 'Studio 2', capacity: 14 },
    { dayOffset: 3, hour: 19, durationMin: 60, classType: 'Yoga Flow', room: 'Studio 2', capacity: 14 },
    { dayOffset: 4, hour: 7, durationMin: 45, classType: 'Cycling', room: 'Studio 1', capacity: 20 },
    { dayOffset: 4, hour: 18, durationMin: 60, classType: 'Boxe', room: 'Salle de force', capacity: 12 },
    { dayOffset: 5, hour: 10, durationMin: 45, classType: 'HIIT Express', room: 'Salle de force', capacity: 16 },
    { dayOffset: 5, hour: 11, durationMin: 60, classType: 'Yoga Flow', room: 'Studio 2', capacity: 14 },
    { dayOffset: 6, hour: 9, durationMin: 45, classType: 'Pilates', room: 'Studio 2', capacity: 14 },
  ];

  const roomByName = new Map(rooms.map((r) => [r.name, r]));
  const typeByName = new Map(classTypes.map((c) => [c.name, c]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let created = 0;
  for (const slot of schedule) {
    const startsAt = new Date(today);
    startsAt.setDate(today.getDate() + slot.dayOffset);
    startsAt.setHours(slot.hour, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + slot.durationMin * 60_000);

    const existing = await prisma.classSession.findFirst({ where: { startsAt } });
    if (existing) continue;

    await prisma.classSession.create({
      data: {
        classTypeId: typeByName.get(slot.classType)!.id,
        roomId: roomByName.get(slot.room)!.id,
        coachId: coach?.userId,
        startsAt,
        endsAt,
        capacity: slot.capacity,
        status: 'SCHEDULED',
      },
    });
    created++;
  }

  console.log(`Cours : ${created} séances créées (salles: ${rooms.length}, types: ${classTypes.length}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
