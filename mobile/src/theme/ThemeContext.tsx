import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colors as lightColors } from './tokens';
import { darkColors } from './darkColors';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';
export type ColorPalette = { [K in keyof typeof lightColors]: string };

const THEME_PREFERENCE_KEY = 'muscleup.themePreference';
const isWeb = Platform.OS === 'web';

async function getPreference(): Promise<ThemePreference | null> {
  const raw = isWeb
    ? globalThis.localStorage?.getItem(THEME_PREFERENCE_KEY) ?? null
    : await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : null;
}

async function setPreferenceStorage(preference: ThemePreference): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(THEME_PREFERENCE_KEY, preference);
    return;
  }
  await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, preference);
}

interface ThemeContextValue {
  colors: ColorPalette;
  scheme: ResolvedScheme;
  preference: ThemePreference;
  setScheme: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    getPreference().then((stored) => {
      if (stored) setPreference(stored);
    });
  }, []);

  const setScheme = (next: ThemePreference) => {
    setPreference(next);
    void setPreferenceStorage(next);
  };

  const resolvedScheme: ResolvedScheme =
    preference === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : preference;
  const colors = resolvedScheme === 'dark' ? darkColors : lightColors;

  const value = useMemo(
    () => ({ colors, scheme: resolvedScheme, preference, setScheme }),
    [colors, resolvedScheme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
