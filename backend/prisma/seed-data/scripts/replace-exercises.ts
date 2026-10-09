/**
 * Script ponctuel : remplace entièrement le catalogue d'exercices par celui
 * généré par fetch-wger.py (vidéo/image HD wger.de, CC-BY-SA) à la place des
 * GIFs 180x180 hasaneyldrm/exercises-dataset.
 *
 * Supprime aussi les ProgramExercise / WorkoutSet existants qui référencent
 * les anciens exercices (pas de cascade de suppression sur Exercise), à la
 * demande explicite — ces données de test seront perdues.
 *
 * Usage : npx tsx prisma/seed-data/scripts/replace-exercises.ts
 */
import { PrismaClient } from '@prisma/client';
import exercisesData from '../exercises.json' with { type: 'json' };
import gifData from '../exercise-gifs.json' with { type: 'json' };

const prisma = new PrismaClient();

async function main() {
  const beforeCounts = {
    exercises: await prisma.exercise.count(),
    programExercises: await prisma.programExercise.count(),
    workoutSets: await prisma.workoutSet.count(),
  };
  console.log('Avant :', beforeCounts);

  await prisma.workoutSet.deleteMany({});
  await prisma.programExercise.deleteMany({});
  await prisma.exercise.deleteMany({});

  const toCreate = (
    exercisesData as Array<{
      name: string;
      muscleGroup: string;
      secondaryMuscles: string[];
      equipment: string;
      instructions: string;
    }>
  ).map((e) => ({
    name: e.name,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment || null,
    instructions: [
      e.instructions,
      e.secondaryMuscles.length ? `Muscles secondaires : ${e.secondaryMuscles.join(', ')}.` : null,
    ]
      .filter(Boolean)
      .join(' '),
  }));

  await prisma.exercise.createMany({ data: toCreate });
  console.log(`Exercices : ${toCreate.length} importés.`);

  const byName = new Map(
    (gifData as Array<{ name: string; gifUrl: string }>).map((g) => [g.name.toLowerCase(), g.gifUrl]),
  );
  const created = await prisma.exercise.findMany({ select: { id: true, name: true } });

  let updated = 0;
  for (const exercise of created) {
    const mediaUrl = byName.get(exercise.name.toLowerCase());
    if (!mediaUrl) continue;
    await prisma.exercise.update({ where: { id: exercise.id }, data: { mediaKey: mediaUrl } });
    updated++;
  }
  console.log(`Médias : ${updated} exercices mis à jour.`);

  const afterCounts = {
    exercises: await prisma.exercise.count(),
    withMedia: await prisma.exercise.count({ where: { mediaKey: { not: null } } }),
  };
  console.log('Après :', afterCounts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
