/** Les 19 valeurs de `Exercise.muscleGroup` (backend, anglais technique, cf.
 * seed-data/exercises.json) mappées vers un libellé FR et une vue (face/dos)
 * pour le sélecteur visuel par silhouette. */

export type BodyView = 'front' | 'back';

export interface MuscleGroupInfo {
  /** Valeur exacte stockée en base / attendue par `GET /v1/exercises?muscleGroup=`. */
  value: string;
  label: string;
  view: BodyView;
}

export const MUSCLE_GROUPS: MuscleGroupInfo[] = [
  { value: 'abs', label: 'Abdominaux', view: 'front' },
  { value: 'pectorals', label: 'Pectoraux', view: 'front' },
  { value: 'delts', label: 'Épaules', view: 'front' },
  { value: 'biceps', label: 'Biceps', view: 'front' },
  { value: 'forearms', label: 'Avant-bras', view: 'front' },
  { value: 'quads', label: 'Quadriceps', view: 'front' },
  { value: 'adductors', label: 'Adducteurs', view: 'front' },
  { value: 'abductors', label: 'Abducteurs', view: 'front' },
  { value: 'serratus anterior', label: 'Dentelés', view: 'front' },
  { value: 'cardiovascular system', label: 'Cardio', view: 'front' },
  { value: 'lats', label: 'Grand dorsal', view: 'back' },
  { value: 'traps', label: 'Trapèzes', view: 'back' },
  { value: 'upper back', label: 'Haut du dos', view: 'back' },
  { value: 'triceps', label: 'Triceps', view: 'back' },
  { value: 'glutes', label: 'Fessiers', view: 'back' },
  { value: 'hamstrings', label: 'Ischio-jambiers', view: 'back' },
  { value: 'calves', label: 'Mollets', view: 'back' },
  { value: 'spine', label: 'Lombaires', view: 'back' },
  { value: 'levator scapulae', label: 'Releveur de la scapula', view: 'back' },
];

export const MUSCLE_GROUP_LABELS: Record<string, string> = Object.fromEntries(
  MUSCLE_GROUPS.map((m) => [m.value, m.label]),
);

export function muscleGroupLabel(value: string): string {
  return MUSCLE_GROUP_LABELS[value] ?? value;
}

export function muscleGroupsForView(view: BodyView): MuscleGroupInfo[] {
  return MUSCLE_GROUPS.filter((m) => m.view === view);
}
