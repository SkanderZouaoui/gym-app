import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { deriveColorFamily, type Branding } from '@muscleup/shared';
import { colors as lightColors } from './tokens';
import { darkColors } from './darkColors';
import { useRemoteConfig } from '../config/RemoteConfigContext';

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

/** Superpose le branding publié par le back-office (primary/secondary/accent)
 * sur la palette statique de base — tout le reste (success/warning/danger/info,
 * surfaces, textes) reste piloté par les tokens par défaut. */
function applyBranding(base: ColorPalette, branding: Branding, dark: boolean): ColorPalette {
  const surface = base.surface;
  const primary = deriveColorFamily(branding.primary, surface, dark);
  const secondary = deriveColorFamily(branding.secondary, surface, dark);
  const accent = deriveColorFamily(branding.accent, surface, dark);

  return {
    ...base,
    primary: primary.base,
    primaryHover: primary.hover,
    primaryPressed: primary.pressed,
    primarySoft: primary.soft,
    primaryBorder: primary.border,
    primaryInk: primary.ink,
    primaryContrast: branding.primaryContrast,
    secondary: secondary.base,
    secondarySoft: secondary.soft,
    secondaryInk: secondary.ink,
    onSecondary: secondary.on,
    accent: accent.base,
    accentSoft: accent.soft,
    accentBorder: accent.border,
    accentInk: accent.ink,
    onAccent: accent.on,
  };
}

interface ThemeContextValue {
  colors: ColorPalette;
  scheme: ResolvedScheme;
  preference: ThemePreference;
  setScheme: (preference: ThemePreference) => void;
  radius: number;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const { config } = useRemoteConfig();

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
  const baseColors = resolvedScheme === 'dark' ? darkColors : lightColors;
  const colors = useMemo(
    () => applyBranding(baseColors, config.branding, resolvedScheme === 'dark'),
    [baseColors, config.branding, resolvedScheme],
  );

  const value = useMemo(
    () => ({ colors, scheme: resolvedScheme, preference, setScheme, radius: config.branding.radius }),
    [colors, resolvedScheme, preference, config.branding.radius],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
