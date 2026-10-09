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
  { value: 'free_weights', label: 'Poids libres' },
  { value: 'machines', label: 'Machines' },
  { value: 'bodyweight', label: 'Poids du corps' },
  { value: 'bands_accessories', label: 'Bandes & accessoires' },
  { value: 'cardio', label: 'Cardio' },
];

interface EquipmentInfo {
  value: string;
  label: string;
  category: EquipmentCategory;
}

const FREE_WEIGHTS: [string, string][] = [
  ['dumbbell', 'Haltères'],
  ['barbell', 'Barre'],
  ['kettlebell', 'Kettlebell'],
  ['ez_bar', 'Barre EZ'],
  ['trap_bar', 'Barre hexagonale'],
  ['plates', 'Disques'],
];

const MACHINES: [string, string][] = [
  ['cable', 'Poulie / Câble'],
  ['smith_machine', 'Smith machine'],
  ['leg_press', 'Presse à cuisses'],
  ['leg_curl', 'Leg curl'],
  ['leg_extension', 'Leg extension'],
  ['lat_pulldown_machine', 'Tirage poitrine'],
  ['hack_squat', 'Hack squat'],
  ['dip_machine', 'Machine à dips'],
  ['assisted_pullup_machine', 'Tractions assistées'],
  ['chest_press_machine', 'Développé machine'],
  ['chest_fly_machine', 'Pec deck (écarté)'],
  ['pec_deck', 'Pec deck'],
  ['shoulder_press_machine', 'Développé épaules machine'],
  ['plate_loaded_lateral_raise_machine', 'Élévations latérales machine'],
  ['hip_abduction_machine', 'Abduction de hanche'],
  ['hip_adduction_machine', 'Adduction de hanche'],
  ['hip_thrust_machine', 'Hip thrust machine'],
  ['back_extension_machine', 'Extension lombaire'],
  ['bicep_curl_machine', 'Curl biceps machine'],
  ['preacher_curl_machine', 'Pupitre à biceps'],
  ['tricep_extension_machine', 'Extension triceps machine'],
  ['ab_crunch_machine', 'Crunch machine'],
  ['standing_calf_raise_machine', 'Mollets debout machine'],
  ['seated_calf_raise_machine', 'Mollets assis machine'],
  ['donkey_calf_raise_machine', 'Mollets "donkey" machine'],
  ['shrug_machine', 'Haussements machine'],
  ['glute_ham_developer', 'Glute-ham developer'],
  ['sled', 'Traîneau (sled)'],
];

const BODYWEIGHT: [string, string][] = [
  ['bodyweight', 'Poids du corps (sans matériel)'],
  ['pull_up_bar', 'Barre de traction'],
  ['dip_station', 'Barres parallèles'],
  ['rings', 'Anneaux'],
  ['suspension_trainer', 'Sangles de suspension'],
  ['flat_bench', 'Banc plat'],
  ['stability_ball', 'Swiss ball'],
  ['ab_wheel', 'Roue abdominale'],
  ['plyo_box', 'Box plyo'],
];

const BANDS_ACCESSORIES: [string, string][] = [
  ['loop_band', 'Bande élastique (boucle)'],
  ['resistance_band', 'Bande de résistance'],
  ['battle_rope', 'Corde ondulatoire'],
  ['climbing_rope', 'Corde à grimper'],
  ['jump_rope', 'Corde à sauter'],
  ['slam_ball', 'Ballon lesté (slam ball)'],
  ['wrist_roller', 'Rouleau de poignet'],
];

const CARDIO: [string, string][] = [
  ['treadmill', 'Tapis de course'],
  ['elliptical', 'Elliptique'],
  ['rower', 'Rameur'],
  ['ski_erg', 'SkiErg'],
  ['stair_climber', 'Stepper'],
  ['stationary_bike', 'Vélo d’appartement'],
  ['air_bike', 'Air bike'],
];

function buildCategory(entries: [string, string][], category: EquipmentCategory): EquipmentInfo[] {
  return entries.map(([value, label]) => ({ value, label, category }));
}

export const EQUIPMENT_OPTIONS: EquipmentInfo[] = [
  ...buildCategory(FREE_WEIGHTS, 'free_weights'),
  ...buildCategory(MACHINES, 'machines'),
  ...buildCategory(BODYWEIGHT, 'bodyweight'),
  ...buildCategory(BANDS_ACCESSORIES, 'bands_accessories'),
  ...buildCategory(CARDIO, 'cardio'),
];

const EQUIPMENT_LABELS: Record<string, string> = Object.fromEntries(
  EQUIPMENT_OPTIONS.map((e) => [e.value, e.label]),
);

/** Libellé FR pour une valeur d'équipement backend — pour les valeurs reçues
 * de l'API mais non listées ci-dessus (nouvelles entrées RepDB futures,
 * valeurs rares non catégorisées), on affiche une version lisible du
 * snake_case plutôt qu'un libellé manquant. */
export function equipmentLabel(value: string): string {
  if (EQUIPMENT_LABELS[value]) return EQUIPMENT_LABELS[value];
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
