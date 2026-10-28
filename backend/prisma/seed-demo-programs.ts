import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Données de démo pour l'onglet Entraînement de member-phase2@muscleup.dev :
 * programmes assignés par le coach, programmes personnels et historique de séances.
 *   npx tsx prisma/seed-demo-programs.ts   (après seed-demo-home.ts, qui crée le coach)
 * Idempotent : un programme déjà présent (même nom) n'est pas recréé.
 */
type ExDef = { name: string; sets: number; reps: string; rest?: number; weight?: number };
type DayDef = { dayOfWeek: number; label: string; exercises: ExDef[] };
type ProgDef = { name: string; byCoach: boolean; days: DayDef[] };

const today = new Date().getDay();

const PROGRAMS: ProgDef[] = [
  {
    name: 'Haut du corps',
    byCoach: true,
    days: [
      { dayOfWeek: 1, label: 'Poussée', exercises: [
        { name: 'Barbell Bench Press', sets: 4, reps: '8-10', rest: 90, weight: 60 },
        { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10', rest: 75, weight: 16 },
        { name: 'Plank', sets: 3, reps: '45s', rest: 45 },
      ] },
      { dayOfWeek: 3, label: 'Tirage', exercises: [
        { name: 'Lat Pulldown', sets: 4, reps: '10-12', rest: 90, weight: 45 },
        { name: 'Bent-Over Dumbbell Row', sets: 3, reps: '10', rest: 75, weight: 20 },
        { name: 'Dumbbell Hammer Curl', sets: 3, reps: '12', rest: 60, weight: 12 },
      ] },
      { dayOfWeek: 5, label: 'Haut complet', exercises: [
        { name: 'Decline Bench Press', sets: 3, reps: '10', rest: 90, weight: 50 },
        { name: 'Lat Pulldown', sets: 3, reps: '12', rest: 75, weight: 40 },
      ] },
      { dayOfWeek: today, label: 'Séance du jour', exercises: [
        { name: 'Barbell Bench Press', sets: 4, reps: '8', rest: 90, weight: 62 },
        { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10', rest: 75, weight: 16 },
        { name: 'Lat Pulldown', sets: 3, reps: '12', rest: 75, weight: 45 },
        { name: 'Dumbbell Hammer Curl', sets: 3, reps: '12', rest: 60, weight: 12 },
      ] },
    ],
  },
  {
    name: 'Mobilité & hanches',
    byCoach: true,
    days: [
      { dayOfWeek: 2, label: 'Hanches', exercises: [
        { name: 'Lunge', sets: 3, reps: '12', rest: 45 },
        { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: 60, weight: 40 },
        { name: 'Plank', sets: 3, reps: '30s', rest: 30 },
      ] },
      { dayOfWeek: 4, label: 'Mobilité', exercises: [
        { name: 'Crescent Lunge', sets: 3, reps: '8', rest: 30 },
        { name: 'Plank', sets: 2, reps: '45s', rest: 30 },
      ] },
    ],
  },
  {
    name: 'Séance maison',
    byCoach: false,
    days: [
      { dayOfWeek: 6, label: 'Poids du corps', exercises: [
        { name: 'Lunge', sets: 3, reps: '15', rest: 45 },
        { name: 'Plank', sets: 3, reps: '40s', rest: 30 },
        { name: 'Crescent Lunge', sets: 3, reps: '10', rest: 30 },
      ] },
    ],
  },
  {
    name: 'Full body débutant',
    byCoach: false,
    days: [
      { dayOfWeek: 1, label: 'Full body A', exercises: [
        { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: 75, weight: 30 },
        { name: 'Barbell Bench Press', sets: 3, reps: '10', rest: 75, weight: 40 },
        { name: 'Lat Pulldown', sets: 3, reps: '12', rest: 60, weight: 35 },
      ] },
      { dayOfWeek: 4, label: 'Full body B', exercises: [
        { name: 'Lunge', sets: 3, reps: '12', rest: 60 },
        { name: 'Dumbbell Shoulder Press', sets: 3, reps: '12', rest: 60, weight: 10 },
      ] },
    ],
  },
  {
    name: 'Prise de masse',
    byCoach: false,
    days: [
      { dayOfWeek: 2, label: 'Pectoraux / Triceps', exercises: [
        { name: 'Barbell Bench Press', sets: 5, reps: '5', rest: 120, weight: 65 },
        { name: 'Straight Bar Dips', sets: 3, reps: '10', rest: 90 },
      ] },
      { dayOfWeek: 5, label: 'Dos / Biceps', exercises: [
        { name: 'Bent-Over Dumbbell Row', sets: 4, reps: '8', rest: 90, weight: 22 },
        { name: 'Dumbbell Hammer Curl', sets: 4, reps: '10', rest: 60, weight: 14 },
      ] },
    ],
  },
];

async function main() {
  const member = await prisma.user.findUnique({ where: { email: 'member-phase2@muscleup.dev' } });
  const coach = await prisma.user.findUnique({ where: { email: 'coach-demo@muscleup.dev' } });
  if (!member || !coach) throw new Error('Lancez d’abord seed-demo-home.ts (compte membre + coach de démo).');

  const exerciseId = async (name: string) => {
    const e = await prisma.exercise.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, isActive: true } });
    if (!e) throw new Error(`Exercice introuvable : ${name}`);
    return e.id;
  };

  let created = 0;
  for (const def of PROGRAMS) {
    const existing = await prisma.program.findFirst({ where: { name: def.name, assignedToId: member.id } });
    if (existing) continue;
    const days = [];
    const seen = new Set<number>();
    for (const d of def.days) {
      if (seen.has(d.dayOfWeek)) continue; // le « jour » courant peut retomber sur un jour déjà défini
      seen.add(d.dayOfWeek);
      days.push({
        dayOfWeek: d.dayOfWeek,
        label: d.label,
        exercises: {
          create: await Promise.all(
            d.exercises.map(async (e, order) => ({
              exerciseId: await exerciseId(e.name),
              order,
              sets: e.sets,
              reps: e.reps,
              restSeconds: e.rest ?? null,
              setDetails: {
                create: Array.from({ length: e.sets }, (_, i) => ({
                  setNumber: i + 1,
                  reps: parseInt(e.reps, 10) || null,
                  weightKg: e.weight ?? null,
                  restSeconds: e.rest ?? null,
                })),
              },
            })),
          ),
        },
      });
    }
    await prisma.program.create({
      data: {
        name: def.name,
        createdById: def.byCoach ? coach.id : member.id,
        assignedToId: member.id,
        startDate: new Date(Date.now() - 21 * 86_400_000),
        days: { create: days },
      },
    });
    created++;
  }

  // Historique : séances réalisées sur le programme « Haut du corps » ces 3 dernières semaines
  const main = await prisma.program.findFirst({
    where: { name: 'Haut du corps', assignedToId: member.id },
    include: { days: { include: { exercises: { orderBy: { order: 'asc' } } } } },
  });
  let logs = 0;
  if (main && (await prisma.workoutLog.count({ where: { userId: member.id, programId: main.id } })) === 0) {
    const plan = [20, 18, 16, 13, 11, 9, 6, 4, 2];
    const trainingDays = main.days.filter((d) => d.dayOfWeek !== today);
    for (let i = 0; i < plan.length; i++) {
      const day = trainingDays[i % trainingDays.length];
      const date = new Date(Date.now() - plan[i] * 86_400_000);
      date.setHours(18, 15, 0, 0);
      await prisma.workoutLog.create({
        data: {
          userId: member.id,
          programId: main.id,
          dayId: day.id,
          date,
          durationMinutes: 48 + (i % 4) * 5,
          feeling: ['Bonne séance', 'Un peu fatigué', 'Très en forme'][i % 3],
          sets: {
            create: day.exercises.flatMap((ex) =>
              Array.from({ length: ex.sets }, (_, s) => ({
                exerciseId: ex.exerciseId,
                setNumber: s + 1,
                weightKg: 20 + i * 1.25 + s * 2.5,
                reps: 8 + (s % 3),
                rpe: 7 + (s % 3),
              })),
            ),
          },
        },
      });
      logs++;
    }
  }

  console.log(`Programmes : ${created} créés. Historique : ${logs} séances ajoutées.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
