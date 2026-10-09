import { PrismaClient } from '@prisma/client';
import exercisesData from './seed-data/exercises.json' with { type: 'json' };
import gifData from './seed-data/exercise-gifs.json' with { type: 'json' };

const prisma = new PrismaClient();

/** Importe la bibliothèque d'exercices (texte uniquement — pas de médias, voir prisma/seed-data/README).
 * Idempotent : ignore les exercices déjà présents (par nom). */
async function seedExercises() {
  const existing = await prisma.exercise.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

  const toCreate = (exercisesData as Array<{
    name: string;
    muscleGroup: string;
    secondaryMuscles: string[];
    equipment: string;
    instructions: string;
  }>).filter((e) => !existingNames.has(e.name.toLowerCase()));

  if (toCreate.length === 0) {
    console.log('Exercices : déjà à jour, rien à importer.');
    return;
  }

  await prisma.exercise.createMany({
    data: toCreate.map((e) => ({
      name: e.name,
      muscleGroup: e.muscleGroup,
      instructions: [
        e.instructions,
        e.equipment ? `Équipement : ${e.equipment}.` : null,
        e.secondaryMuscles.length ? `Muscles secondaires : ${e.secondaryMuscles.join(', ')}.` : null,
      ]
        .filter(Boolean)
        .join(' '),
    })),
  });

  console.log(`Exercices : ${toCreate.length} importés.`);
}

/** Renseigne le GIF démonstratif de chaque exercice (mediaKey = URL CDN directe).
 * Idempotent : ne touche que les exercices qui n'ont pas encore de mediaKey. */
async function seedExerciseGifs() {
  const byName = new Map(
    (gifData as Array<{ name: string; gifUrl: string }>).map((g) => [g.name.toLowerCase(), g.gifUrl]),
  );

  const withoutMedia = await prisma.exercise.findMany({
    where: { mediaKey: null },
    select: { id: true, name: true },
  });

  let updated = 0;
  for (const exercise of withoutMedia) {
    const gifUrl = byName.get(exercise.name.toLowerCase());
    if (!gifUrl) continue;
    await prisma.exercise.update({ where: { id: exercise.id }, data: { mediaKey: gifUrl } });
    updated++;
  }

  console.log(`GIFs : ${updated} exercices mis à jour.`);
}

async function main() {
  await seedExercises();
  await seedExerciseGifs();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
