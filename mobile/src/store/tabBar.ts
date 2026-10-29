import { create } from 'zustand';

interface TabBarState {
  /** true quand la barre d'onglets est repliée (scroll vers le bas). */
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  /** Nombre d'écrans qui exigent la barre repliée (ex. bouton d'enregistrement fixé en bas). */
  suppressed: number;
  suppress: (delta: 1 | -1) => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  hidden: false,
  setHidden: (hidden) => set((s) => (s.hidden === hidden ? s : { hidden })),
  suppressed: 0,
  suppress: (delta) => set((s) => ({ suppressed: Math.max(0, s.suppressed + delta) })),
}));
