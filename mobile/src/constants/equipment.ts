
import i18n from '../i18n';
/** Les valeurs de `Exercise.equipment` (backend, snake_case, RepDB) mappées
 * vers un libellé FR et une catégorie, pour le filtre groupé de la
 * bibliothèque d'exercices. Catégories volontairement larges : l'utilisateur
 * cherche "une machine" ou "des haltères", pas un équipement précis parmi 56. */

export type EquipmentCategory =
  | 'free_weights'
  | 'machines'
  | 'bodyweight'
  | 'bands_accessories'
  | 'cardio';

export interface EquipmentCategoryInfo {
  value: EquipmentCategory;
  label: string;
}

export const EQUIPMENT_CATEGORIES: EquipmentCategoryInfo[] = [
  { value: 'free_weights', get label() { return i18n.t('common.poids_libres'); } },
  { value: 'machines', get label() { return i18n.t('common.machines'); } },
  { value: 'bodyweight', get label() { return i18n.t('common.poids_du_corps'); } },
  { value: 'bands_accessories', get label() { return i18n.t('common.bandes_accessoires'); } },
  { value: 'cardio', get label() { return i18n.t('common.cardio'); } },
];

interface EquipmentInfo {
  value: string;
  label: string;
  category: EquipmentCategory;
}

const FREE_WEIGHTS: string[] = [
  'dumbbell',
  'barbell',
  'kettlebell',
  'ez_bar',
  'trap_bar',
  'plates',
];

const MACHINES: string[] = [
  'cable',
  'smith_machine',
  'leg_press',
  'leg_curl',
  'leg_extension',
  'lat_pulldown_machine',
  'hack_squat',
  'dip_machine',
  'assisted_pullup_machine',
  'chest_press_machine',
  'chest_fly_machine',
  'pec_deck',
  'shoulder_press_machine',
  'plate_loaded_lateral_raise_machine',
  'hip_abduction_machine',
  'hip_adduction_machine',
  'hip_thrust_machine',
  'back_extension_machine',
  'bicep_curl_machine',
  'preacher_curl_machine',
  'tricep_extension_machine',
  'ab_crunch_machine',
  'standing_calf_raise_machine',
  'seated_calf_raise_machine',
  'donkey_calf_raise_machine',
  'shrug_machine',
  'glute_ham_developer',
  'sled',
];

const BODYWEIGHT: string[] = [
  'bodyweight',
  'pull_up_bar',
  'dip_station',
  'rings',
  'suspension_trainer',
  'flat_bench',
  'stability_ball',
  'ab_wheel',
  'plyo_box',
];

const BANDS_ACCESSORIES: string[] = [
  'loop_band',
  'resistance_band',
  'battle_rope',
  'climbing_rope',
  'jump_rope',
  'slam_ball',
  'wrist_roller',
];

const CARDIO: string[] = [
  'treadmill',
  'elliptical',
  'rower',
  'ski_erg',
  'stair_climber',
  'stationary_bike',
  'air_bike',
];

function buildCategory(entries: string[], category: EquipmentCategory): EquipmentInfo[] {
  // Libellé évalué à l'usage : suit la langue courante.
  return entries.map((value) => ({ value, get label() { return i18n.t(`equipment.${value}`); }, category }));
}

export const EQUIPMENT_OPTIONS: EquipmentInfo[] = [
  ...buildCategory(FREE_WEIGHTS, 'free_weights'),
  ...buildCategory(MACHINES, 'machines'),
  ...buildCategory(BODYWEIGHT, 'bodyweight'),
  ...buildCategory(BANDS_ACCESSORIES, 'bands_accessories'),
  ...buildCategory(CARDIO, 'cardio'),
];

/** Libellé (langue courante) pour une valeur d'équipement backend — pour les valeurs reçues
 * de l'API mais non listées ci-dessus (nouvelles entrées RepDB futures,
 * valeurs rares non catégorisées), on affiche une version lisible du
 * snake_case plutôt qu'un libellé manquant. */
export function equipmentLabel(value: string): string {
  if (i18n.exists(`equipment.${value}`)) return i18n.t(`equipment.${value}`);
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function equipmentOptionsByCategory(available: string[]): Map<EquipmentCategory, EquipmentInfo[]> {
  const availableSet = new Set(available);
  const known = EQUIPMENT_OPTIONS.filter((e) => availableSet.has(e.value));
  const knownValues = new Set(known.map((e) => e.value));
  const unknown = available
    .filter((v) => !knownValues.has(v))
    .map((v) => ({ value: v, label: equipmentLabel(v), category: 'machines' as EquipmentCategory }));

  const map = new Map<EquipmentCategory, EquipmentInfo[]>();
  for (const entry of [...known, ...unknown]) {
    const list = map.get(entry.category) ?? [];
    list.push(entry);
    map.set(entry.category, list);
  }
  return map;
}
