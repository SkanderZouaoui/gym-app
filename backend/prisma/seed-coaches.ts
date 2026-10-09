import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/** Enrichit le coach existant (prix, note) et crée des coachs supplémentaires
 * pour que l'annuaire Coaching adhérent ne soit pas vide :
 *   npx tsx prisma/seed-coaches.ts
 */
async function main() {
  // Coach existant : ajoute prix/note s'ils manquent encore.
  const existingCoach = await prisma.coachProfile.findFirst();
  if (existingCoach && existingCoach.sessionPrice === null) {
    await prisma.coachProfile.update({
      where: { userId: existingCoach.userId },
      data: { yearsExperience: 8, sessionPrice: 45, rating: 4.9, reviewCount: 128 },
    });
    console.log(`Coach existant (${existingCoach.userId}) : prix/note ajoutés.`);
  }

  const newCoaches = [
    {
      email: 'coach2@muscleup.dev',
      firstName: 'Sarra',
      lastName: 'Mansour',
      bio: 'Coach yoga et mobilité certifiée, spécialiste de la récupération active et de la prévention des blessures.',
      specialties: ['Yoga', 'Mobilité', 'Récupération'],
      yearsExperience: 5,
      sessionPrice: 40,
      rating: 4.8,
      reviewCount: 64,
      slots: [
        { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 2, startTime: '18:00', endTime: '19:00' },
        { dayOfWeek: 4, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 6, startTime: '10:00', endTime: '11:00' },
      ],
    },
    {
      email: 'coach3@muscleup.dev',
      firstName: 'Mehdi',
      lastName: 'Trabelsi',
      bio: 'Ancien boxeur amateur, prépare au cardio et à la boxe fitness. Séances intenses, suivi de progression rapproché.',
      specialties: ['Boxe', 'Cardio', 'Endurance'],
      yearsExperience: 10,
      sessionPrice: 50,
      rating: 4.7,
      reviewCount: 96,
      slots: [
        { dayOfWeek: 0, startTime: '11:00', endTime: '12:00' },
        { dayOfWeek: 2, startTime: '07:00', endTime: '08:00' },
        { dayOfWeek: 4, startTime: '17:00', endTime: '18:00' },
        { dayOfWeek: 4, startTime: '20:00', endTime: '21:00' },
      ],
    },
  ];

  for (const c of newCoaches) {
    const existing = await prisma.user.findUnique({ where: { email: c.email } });
    if (existing) {
      console.log(`${c.email} : déjà présent, rien à faire.`);
      continue;
    }

    const passwordHash = await argon2.hash('CoachDemo123!');
    const user = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash,
        firstName: c.firstName,
        lastName: c.lastName,
        roles: { create: { role: 'COACH' } },
        coachProfile: {
          create: {
            bio: c.bio,
            specialties: c.specialties,
            yearsExperience: c.yearsExperience,
            sessionPrice: c.sessionPrice,
            rating: c.rating,
            reviewCount: c.reviewCount,
          },
        },
      },
    });

    for (const slot of c.slots) {
      await prisma.coachAvailability.create({
        data: { coachId: user.id, ...slot },
      });
    }

    console.log(`${c.email} : coach créé avec ${c.slots.length} créneaux.`);
  }

  console.log('Seed coachs terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
