import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Grille de cours collectifs RÉCURRENTS (modèles hebdomadaires) + génération des séances à venir.
 * Idempotent : relançable sans doublons.
 *   npx tsx prisma/seed-weekly-classes.ts            (4 semaines par défaut)
 *   WEEKS=8 npx tsx prisma/seed-weekly-classes.ts
 */
const WEEKS = Number(process.env.WEEKS ?? 4);

type Slot = { day: number; time: string; min: number; type: string; room: string; capacity: number };

// day : 0 = dimanche … 6 = samedi
const GRID: Slot[] = [
  // Lundi
  { day: 1, time: '07:00', min: 45, type: 'Cycling', room: 'Salle de Spinning', capacity: 20 },
  { day: 1, time: '12:15', min: 30, type: 'HIIT Express', room: 'Salle de force', capacity: 16 },
  { day: 1, time: '18:30', min: 60, type: 'Yoga Flow', room: 'Salle de Cours', capacity: 14 },
  // Mardi
  { day: 2, time: '09:00', min: 45, type: 'Aqua Bike', room: 'Piscine', capacity: 14 },
  { day: 2, time: '18:00', min: 60, type: 'Boxe', room: 'Salle de force', capacity: 12 },
  { day: 2, time: '19:30', min: 45, type: 'Cycling', room: 'Salle de Spinning', capacity: 20 },
  // Mercredi
  { day: 3, time: '07:00', min: 45, type: 'Cycling', room: 'Salle de Spinning', capacity: 20 },
  { day: 3, time: '12:15', min: 30, type: 'HIIT Express', room: 'Salle de force', capacity: 16 },
  { day: 3, time: '17:30', min: 60, type: 'Yoga Flow', room: 'Salle de Cours', capacity: 14 },
  { day: 3, time: '19:00', min: 45, type: 'Aqua Bike', room: 'Piscine', capacity: 14 },
  // Jeudi
  { day: 4, time: '09:00', min: 45, type: 'Aqua Bike', room: 'Piscine', capacity: 14 },
  { day: 4, time: '12:30', min: 45, type: 'Cycling', room: 'Salle de Spinning', capacity: 20 },
  { day: 4, time: '19:00', min: 60, type: 'Boxe', room: 'Salle de force', capacity: 12 },
  // Vendredi
  { day: 5, time: '07:00', min: 45, type: 'Cycling', room: 'Salle de Spinning', capacity: 20 },
  { day: 5, time: '12:15', min: 30, type: 'HIIT Express', room: 'Salle de force', capacity: 16 },
  { day: 5, time: '18:00', min: 60, type: 'Yoga Flow', room: 'Salle de Cours', capacity: 14 },
  // Samedi
  { day: 6, time: '10:00', min: 45, type: 'HIIT Express', room: 'Salle de force', capacity: 16 },
  { day: 6, time: '11:00', min: 60, type: 'Yoga Flow', room: 'Salle de Cours', capacity: 14 },
  { day: 6, time: '16:00', min: 60, type: 'Boxe', room: 'Salle de force', capacity: 12 },
  // Dimanche
  { day: 0, time: '09:30', min: 45, type: 'Aqua Bike', room: 'Piscine', capacity: 14 },
  { day: 0, time: '11:00', min: 45, type: 'Cycling', room: 'Salle de Spinning', capacity: 20 },
];

async function main() {
  const coaches = await prisma.coachProfile.findMany({ orderBy: { userId: 'asc' } });

  const rooms = new Map<string, { id: string; capacity: number }>();
  for (const name of new Set(GRID.map((g) => g.room))) {
    const found = await prisma.room.findFirst({ where: { name } });
    if (!found) throw new Error(`Salle introuvable : ${name}`);
    rooms.set(name, found);
  }

  const types = new Map<string, { id: string }>();
  for (const name of new Set(GRID.map((g) => g.type))) {
    const found = await prisma.classType.findFirst({ where: { name } });
    if (!found) throw new Error(`Type de cours introuvable : ${name} `);
    types.set(name, found);
  }

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + WEEKS * 7);

  let templatesCreated = 0;
  let sessionsCreated = 0;

  for (const [i, slot] of GRID.entries()) {
    const classTypeId = types.get(slot.type)!.id;
    const roomId = rooms.get(slot.room)!.id;
    const coachId = coaches.length ? coaches[i % coaches.length].userId : null;

    let template = await prisma.classTemplate.findFirst({
      where: { classTypeId, roomId, dayOfWeek: slot.day, startTime: slot.time },
    });
    if (!template) {
      template = await prisma.classTemplate.create({
        data: { classTypeId, roomId, coachId, capacity: Math.min(slot.capacity, rooms.get(slot.room)!.capacity), frequency: 'WEEKLY', dayOfWeek: slot.day, startTime: slot.time, durationMin: slot.min },
      });
      templatesCreated++;
    }

    const [hour, minute] = slot.time.split(':').map(Number);
    for (const day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
      if (day.getDay() !== slot.day) continue;
      const startsAt = new Date(day);
      startsAt.setHours(hour, minute, 0, 0);
      if (startsAt.getTime() < Date.now()) continue;
      // Même logique que ClassesService.generateSessions : une séance par modèle et par créneau.
      if (await prisma.classSession.findFirst({ where: { templateId: template.id, startsAt } })) continue;
      await prisma.classSession.create({
        data: {
          templateId: template.id,
          classTypeId,
          roomId,
          coachId: template.coachId,
          startsAt,
          endsAt: new Date(startsAt.getTime() + slot.min * 60_000),
          capacity: template.capacity,
        },
      });
      sessionsCreated++;
    }
  }

  console.log(`Cours récurrents : ${templatesCreated} modèles hebdomadaires créés, ${sessionsCreated} séances générées sur ${WEEKS} semaines.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
