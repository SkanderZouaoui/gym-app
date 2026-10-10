import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import i18n, { type AppLanguage } from './index';
import { getItem, setItem } from '../api/storage';

const LANGUAGE_KEY = 'muscleup.language';

interface LanguageContextValue {
  language: AppLanguage;
  isRtl: boolean;
  setLanguage: (lang: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Bascule FR/AR logique (sans I18nManager.forceRTL — pas de redémarrage de
 * l'app). `isRtl` pilote manuellement textAlign/flexDirection dans les
 * écrans qui en ont besoin ; la mise en page par défaut de React Native
 * reste LTR, ce qui est suffisant pour un RTL "de contenu" sans exiger une
 * réécriture de layout native.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('fr');

  useEffect(() => {
    getItem(LANGUAGE_KEY).then((stored) => {
      if (stored === 'fr' || stored === 'ar') {
        setLanguageState(stored);
        void i18n.changeLanguage(stored);
      }
    });
  }, []);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    void i18n.changeLanguage(lang);
    void setItem(LANGUAGE_KEY, lang);
  };

  const value = useMemo(
    () => ({ language, isRtl: language === 'ar', setLanguage }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
