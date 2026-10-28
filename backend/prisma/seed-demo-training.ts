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
