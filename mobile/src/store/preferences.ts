import { create } from 'zustand';
import { getItem, setItem } from '../api/storage';

const KEY = 'muscleup.preferences';

export interface Preferences {
  /** Alerte avant l'expiration de l'abonnement (préférence enregistrée sur l'appareil). */
  expiryAlert: boolean;
  /** Rappel avant un cours réservé (préférence enregistrée sur l'appareil). */
  classReminder: boolean;
  /** Réduit les animations de l'application (en plus du réglage système). */
  reduceMotion: boolean;
}

interface PreferencesState extends Preferences {
  hydrated: boolean;
  set: (patch: Partial<Preferences>) => void;
  hydrate: () => Promise<void>;
}

const DEFAULTS: Preferences = { expiryAlert: true, classReminder: true, reduceMotion: false };

/** Préférences d'affichage et de notification de l'adhérent, conservées dans le stockage sécurisé de l'appareil. */
export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  set: (patch) => {
    set(patch);
    const { expiryAlert, classReminder, reduceMotion } = get();
    void setItem(KEY, JSON.stringify({ expiryAlert, classReminder, reduceMotion }));
  },
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await getItem(KEY);
      if (raw) set({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) });
    } catch {
      // stockage illisible : on garde les valeurs par défaut
    }
    set({ hydrated: true });
  },
}));
