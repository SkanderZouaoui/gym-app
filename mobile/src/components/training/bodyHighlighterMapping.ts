import type { Slug } from 'react-native-body-highlighter';

/** Correspondance entre les valeurs `Exercise.muscleGroup` (backend) et les
 * `Slug` de `react-native-body-highlighter`, qui fournit des tracés
 * anatomiques réels (face/dos) pour chaque groupe musculaire — y compris
 * trapèze et avant-bras, absents de nos illustrations SVG maison. */
export const MUSCLE_GROUP_TO_SLUG: Partial<Record<string, Slug>> = {
  abs: 'abs',
  pectorals: 'chest',
  delts: 'deltoids',
  biceps: 'biceps',
  forearms: 'forearm',
  quads: 'quadriceps',
  adductors: 'adductors',
  traps: 'trapezius',
  'upper back': 'upper-back',
  triceps: 'triceps',
  glutes: 'gluteal',
  hamstrings: 'hamstring',
  calves: 'calves',
  spine: 'lower-back',
};

/** `slug -> muscleGroup` inversé, pour traduire le tap sur une zone en
 * valeur de filtre backend. */
export const SLUG_TO_MUSCLE_GROUP: Partial<Record<Slug, string>> = Object.fromEntries(
  Object.entries(MUSCLE_GROUP_TO_SLUG).map(([group, slug]) => [slug, group]),
);
