import { createMMKV } from 'react-native-mmkv';

/** Poids et répétitions de la dernière séance enregistrée, par exercice et par série, gardés sur l'appareil.
 * Ils servent à pré-remplir la séance suivante dès l'enregistrement, sans attendre que l'historique
 * (`/v1/me/workouts`) soit rechargé : sinon l'écran lirait l'ancien cache et reprendrait les valeurs
 * d'avant. Le serveur reste la référence dès qu'il renvoie une séance plus récente. */
const storage = createMMKV({ id: 'muscleup-last-weights' });

export interface LastWeights {
  /** Horodatage (ms) de l'enregistrement. */
  at: number;
  /** [numéro de série, poids en kg], trié par numéro de série. */
  weights: [number, number][];
  /** [numéro de série, répétitions], trié par numéro de série (absent des enregistrements plus anciens). */
  reps?: [number, number][];
}

export function rememberSessionWeights(
  sets: { exerciseId: string; setNumber: number; weightKg?: number | null; reps?: number | null }[],
  at: number = Date.now(),
): void {
  const byExercise = new Map<string, { weights: [number, number][]; reps: [number, number][] }>();
  for (const s of sets) {
    if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, { weights: [], reps: [] });
    const entry = byExercise.get(s.exerciseId)!;
    if (s.weightKg != null && Number.isFinite(s.weightKg)) entry.weights.push([s.setNumber, s.weightKg]);
    if (s.reps != null && Number.isFinite(s.reps) && s.reps > 0) entry.reps.push([s.setNumber, s.reps]);
  }
  for (const [exerciseId, { weights, reps }] of byExercise) {
    if (weights.length === 0 && reps.length === 0) continue;
    weights.sort((a, b) => a[0] - b[0]);
    reps.sort((a, b) => a[0] - b[0]);
    const value: LastWeights = { at, weights, reps };
    storage.set(exerciseId, JSON.stringify(value));
  }
}

export function readRememberedWeights(exerciseId: string): LastWeights | null {
  const raw = storage.getString(exerciseId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastWeights;
  } catch {
    return null;
  }
}
