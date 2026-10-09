/** Les instructions sont stockées en un seul paragraphe (voir backend/prisma/seed.ts) :
 * "<étapes>. Équipement : <...>. Muscles secondaires : <...>."
 * On extrait ces segments pour un affichage fidèle à la maquette (étapes numérotées
 * + chips), sans altérer la donnée source. */
export function parseExerciseInstructions(raw: string | null) {
  if (!raw) return { steps: [], equipment: null, secondaryMuscles: [] as string[] };

  let text = raw;
  let equipment: string | null = null;
  let secondaryMuscles: string[] = [];

  const secondaryMatch = text.match(/Muscles secondaires\s*:\s*([^.]+)\.?\s*$/i);
  if (secondaryMatch) {
    secondaryMuscles = secondaryMatch[1].split(',').map((m) => m.trim()).filter(Boolean);
    text = text.slice(0, secondaryMatch.index).trim();
  }

  const equipmentMatch = text.match(/Équipement\s*:\s*([^.]+)\.?\s*$/i);
  if (equipmentMatch) {
    equipment = equipmentMatch[1].trim();
    text = text.slice(0, equipmentMatch.index).trim();
  }

  const steps = text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ü])/)
    .map((s) => s.trim())
    .filter(Boolean);

  return { steps, equipment, secondaryMuscles };
}
