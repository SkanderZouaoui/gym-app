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
  /** Raccourcis affichés sur l'accueil admin (clés du catalogue), dans l'ordre choisi. */
  adminShortcuts: string[];
  /** Alertes et annonces fermées avec la croix : elles ne reviennent plus sur l'accueil (restent dans Notifications). */
  dismissedNotices: string[];
}

interface PreferencesState extends Preferences {
  hydrated: boolean;
  set: (patch: Partial<Preferences>) => void;
  hydrate: () => Promise<void>;
}

export const DEFAULT_ADMIN_SHORTCUTS = ['cash', 'member', 'class', 'announce', 'programs', 'scan'];
const DEFAULTS: Preferences = { expiryAlert: true, classReminder: true, reduceMotion: false, adminShortcuts: DEFAULT_ADMIN_SHORTCUTS, dismissedNotices: [] };

/** Préférences d'affichage et de notification de l'adhérent, conservées dans le stockage sécurisé de l'appareil. */
export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  set: (patch) => {
    set(patch);
    const { expiryAlert, classReminder, reduceMotion, adminShortcuts, dismissedNotices } = get();
    void setItem(KEY, JSON.stringify({ expiryAlert, classReminder, reduceMotion, adminShortcuts, dismissedNotices }));
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

/** Fermeture définitive (sur l'appareil) des alertes et annonces de l'accueil. */
export function useDismissedNotices() {
  const dismissed = usePreferencesStore((s) => s.dismissedNotices);
  const set = usePreferencesStore((s) => s.set);
  return {
    isDismissed: (id: string) => dismissed.includes(id),
    dismiss: (id: string) => {
      if (!dismissed.includes(id)) set({ dismissedNotices: [...dismissed, id].slice(-300) });
    },
  };
}
