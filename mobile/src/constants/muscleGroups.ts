
import i18n from '../i18n';
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
  { value: 'abs', get label() { return i18n.t('common.abdominaux'); }, view: 'front' },
  { value: 'pectorals', get label() { return i18n.t('common.pectoraux'); }, view: 'front' },
  { value: 'delts', get label() { return i18n.t('common.epaules'); }, view: 'front' },
  { value: 'biceps', get label() { return i18n.t('common.biceps'); }, view: 'front' },
  { value: 'forearms', get label() { return i18n.t('common.avant_bras'); }, view: 'front' },
  { value: 'quads', get label() { return i18n.t('common.quadriceps'); }, view: 'front' },
  { value: 'adductors', get label() { return i18n.t('common.adducteurs'); }, view: 'front' },
  { value: 'abductors', get label() { return i18n.t('common.abducteurs'); }, view: 'front' },
  { value: 'serratus anterior', get label() { return i18n.t('common.denteles'); }, view: 'front' },
  { value: 'cardiovascular system', get label() { return i18n.t('common.cardio'); }, view: 'front' },
  { value: 'lats', get label() { return i18n.t('common.grand_dorsal'); }, view: 'back' },
  { value: 'traps', get label() { return i18n.t('common.trapezes'); }, view: 'back' },
  { value: 'upper back', get label() { return i18n.t('common.haut_du_dos'); }, view: 'back' },
  { value: 'triceps', get label() { return i18n.t('common.triceps'); }, view: 'back' },
  { value: 'glutes', get label() { return i18n.t('common.fessiers'); }, view: 'back' },
  { value: 'hamstrings', get label() { return i18n.t('common.ischio_jambiers'); }, view: 'back' },
  { value: 'calves', get label() { return i18n.t('common.mollets'); }, view: 'back' },
  { value: 'spine', get label() { return i18n.t('common.lombaires'); }, view: 'back' },
  { value: 'levator scapulae', get label() { return i18n.t('common.releveur_de_la_scapula'); }, view: 'back' },
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
