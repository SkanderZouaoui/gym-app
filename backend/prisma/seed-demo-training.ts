import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Données de démo pour tester les écrans Entraînement/Progression/Coaching :
 *   npx tsx prisma/seed-demo-training.ts
 */
async function main() {
  const coach = await prisma.coachProfile.findFirst();
  const member = await prisma.user.findFirst({ where: { email: 'member-phase2@muscleup.dev' } });

  if (!coach) throw new Error('Coach introuvable — lancez les seeds de base avant.');

  // Bio et spécialités du coach
  await prisma.coachProfile.update({
    where: { userId: coach.userId },
    data: {
      bio: 'Préparateur physique diplômé, 8 ans d\'expérience. Programmes de force progressifs et suivi nutritionnel simple.',
      specialties: ['Force', 'HIIT', 'Perte de poids'],
    },
  });

  // Disponibilités récurrentes (lun/mer/ven, créneaux horaires)
  const existingAvailability = await prisma.coachAvailability.findFirst({ where: { coachId: coach.userId } });
  if (!existingAvailability) {
    const slots = [
      { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
      { dayOfWeek: 1, startTime: '14:00', endTime: '15:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '09:00' },
      { dayOfWeek: 3, startTime: '16:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 5, startTime: '19:00', endTime: '20:00' },
    ];
    for (const s of slots) {
      await prisma.coachAvailability.create({ data: { coachId: coach.userId, ...s } });
    }
    console.log(`Disponibilités : ${slots.length} créneaux créés pour ${coach.userId}.`);
  } else {
    console.log('Disponibilités : déjà présentes, rien à faire.');
  }

  // Mesures corporelles (historique de poids sur 2 mois)
  if (member) {
    const existingMetrics = await prisma.bodyMetric.count({ where: { userId: member.id } });
    if (existingMetrics <= 1) {
      const points = [
        { daysAgo: 56, weightKg: 74.6 },
        { daysAgo: 42, weightKg: 73.8 },
        { daysAgo: 28, weightKg: 73.0 },
        { daysAgo: 14, weightKg: 72.1 },
        { daysAgo: 0, weightKg: 71.8, measurements: { waist: 78, bodyFat: 24, arm: 31 } },
      ];
      for (const p of points) {
        const date = new Date();
        date.setDate(date.getDate() - p.daysAgo);
        await prisma.bodyMetric.create({
          data: { userId: member.id, date, weightKg: p.weightKg, measurements: p.measurements ?? {} },
        });
      }
      console.log(`Mesures : ${points.length} points créés pour ${member.email}.`);
    } else {
      console.log('Mesures : déjà présentes, rien à faire.');
    }
  }

  console.log('Seed de démo Entraînement terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
