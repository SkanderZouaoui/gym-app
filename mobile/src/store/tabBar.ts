import { create } from 'zustand';

interface TabBarState {
  /** true quand la barre d'onglets est repliée (scroll vers le bas). */
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  hidden: false,
  setHidden: (hidden) => set((s) => (s.hidden === hidden ? s : { hidden })),
}));
