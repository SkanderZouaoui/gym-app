import { create } from 'zustand';
import type { SetDraft } from '../components/training/SetRow';

export interface ExercisePick {
  /** Écran qui doit consommer le choix : le composeur de programme ou la séance en cours. */
  target: 'builder' | 'session';
  exerciseId: string;
  name: string;
  sets: SetDraft[];
  dayIndex?: number;
  editingIndex?: number;
}

interface ExercisePickState {
  pick: ExercisePick | null;
  setPick: (pick: ExercisePick) => void;
  clear: () => void;
}

/** Transmet l'exercice choisi (bibliothèque → réglage des séries) à l'écran d'origine sans le
 * recréer : l'écran d'origine reste monté sous la pile, on revient dessus puis il consomme le choix. */
export const useExercisePickStore = create<ExercisePickState>((set) => ({
  pick: null,
  setPick: (pick) => set({ pick }),
  clear: () => set({ pick: null }),
}));
