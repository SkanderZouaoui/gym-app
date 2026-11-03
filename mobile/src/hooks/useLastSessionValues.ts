import { useMemo } from 'react';
import { useMyWorkouts } from './useCoaching';
import { readRememberedWeights } from './lastWeights';

/** Valeurs de la dernière séance enregistrée pour un exercice, par numéro de série. */
export interface LastSession {
  at: number;
  weightBySet: Map<number, number>;
  repsBySet: Map<number, number>;
}

/** Valeur de la dernière série renseignée (sert aux séries en plus de la séance précédente). */
export function valueOfLastSet(values: Map<number, number>): number | undefined {
  return values.size > 0 ? values.get(Math.max(...values.keys())) : undefined;
}

/** Valeur de la série `setNumber` à la dernière séance (à défaut, de sa dernière série). */
export function lastValueForSet(values: Map<number, number> | undefined, setNumber: number): number | undefined {
  return values ? (values.get(setNumber) ?? valueOfLastSet(values)) : undefined;
}

/** Poids et répétitions de la séance la plus récente qui contient chaque exercice, série par série, sans mélanger
 * plusieurs séances. L'enregistrement local (lastWeights) couvre l'intervalle où l'historique n'a pas encore été
 * rechargé après une sauvegarde. Sert à pré-remplir la séance et à afficher le détail d'un programme. */
export function useLastSessionValues(exerciseIds: string[]): Map<string, LastSession> {
  const { data: workouts } = useMyWorkouts();
  const idsKey = exerciseIds.join(',');
  return useMemo(() => {
    const map = new Map<string, LastSession>();
    if (workouts) {
      const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      for (const log of sorted) {
        const perExercise = new Map<string, LastSession>();
        for (const s of log.sets) {
          if (map.has(s.exerciseId)) continue;
          let entry = perExercise.get(s.exerciseId);
          if (!entry) {
            entry = { at: new Date(log.date).getTime(), weightBySet: new Map(), repsBySet: new Map() };
            perExercise.set(s.exerciseId, entry);
          }
          if (s.weightKg) entry.weightBySet.set(s.setNumber, Number(s.weightKg));
          if (s.reps) entry.repsBySet.set(s.setNumber, s.reps);
        }
        for (const [exerciseId, entry] of perExercise) {
          if (entry.weightBySet.size > 0 || entry.repsBySet.size > 0) map.set(exerciseId, entry);
        }
      }
    }
    for (const exerciseId of idsKey ? idsKey.split(',') : []) {
      const local = readRememberedWeights(exerciseId);
      if (!local || (local.weights.length === 0 && !local.reps?.length) || (map.get(exerciseId)?.at ?? 0) >= local.at) continue;
      map.set(exerciseId, { at: local.at, weightBySet: new Map(local.weights), repsBySet: new Map(local.reps ?? []) });
    }
    return map;
  }, [workouts, idsKey]);
}

interface PlannedExercise {
  sets: number;
  reps: string;
  setDetails: { setNumber: number; reps: number | null; weightKg: string | null }[];
}

export interface ExerciseSummary {
  count: number;
  /** « 10 », « 12 · 10 · 8 » ou « 8–12 » ; repli sur la valeur du programme si aucune répétition n'est connue. */
  repsLabel: string;
  /** « 60 », « 50–60 » ; null pour un exercice au poids du corps. */
  weightLabel: string | null;
}

function compact(values: number[]): string {
  const distinct = Array.from(new Set(values));
  if (distinct.length === 1) return String(distinct[0]);
  if (values.length <= 5) return values.join(' · ');
  return `${Math.min(...values)}–${Math.max(...values)}`;
}

/** Séries réelles d'un exercice, telles que la séance les proposera : la dernière séance enregistrée en priorité,
 * puis le détail prévu au programme, puis les valeurs globales (séries × répétitions) du programme. */
export function summarizeExercise(ex: PlannedExercise, last?: LastSession): ExerciseSummary {
  const base = ex.setDetails.length > 0
    ? ex.setDetails
    : Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, reps: null, weightKg: null }));
  const reps: number[] = [];
  const weights: number[] = [];
  for (const s of base) {
    const r = lastValueForSet(last?.repsBySet, s.setNumber) ?? s.reps;
    if (r) reps.push(Number(r));
    const w = lastValueForSet(last?.weightBySet, s.setNumber) ?? (s.weightKg ? Number(s.weightKg) : undefined);
    if (w) weights.push(w);
  }
  return {
    count: base.length,
    repsLabel: reps.length > 0 ? compact(reps) : ex.reps,
    weightLabel: weights.length > 0 ? compact(weights) : null,
  };
}
