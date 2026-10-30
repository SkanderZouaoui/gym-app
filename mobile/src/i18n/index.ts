import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;

/** Libellés des langues, chacun dans sa propre langue. */
export const LANGUAGE_LABELS: Record<AppLanguage, string> = { fr: 'Français', en: 'English', ar: 'العربية' };

const DATE_LOCALES: Record<AppLanguage, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN' };

/** Locale des dates/heures (toLocaleDateString…) selon la langue courante. */
export function dateLocale(): string {
  return DATE_LOCALES[(i18n.language as AppLanguage) ?? 'fr'] ?? 'fr-FR';
}
