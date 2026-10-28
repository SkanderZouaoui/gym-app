import { colors } from './tokens';

type ColorPalette = { [K in keyof typeof colors]: string };

/** Palette sombre — même forme que `colors` (drop-in), cf. moteur de thème (ThemeContext). */
export const darkColors: ColorPalette = {
  bg: '#0B0B0F',
  surface: '#16161C',
  surface2: '#202029',
  text: '#FFFFFF',
  muted: '#A3A3B2',
  border: '#272731',
  borderStrong: '#3A3A47',

  primary: '#7C3AED',
  primaryHover: '#8A4FF0',
  primaryPressed: '#5D2BB2',
  primarySoft: '#1F1533',
  primaryBorder: '#43307A',
  primaryInk: '#C9B2FA',
  primaryContrast: '#FFFFFF',

  secondary: '#2B1049',
  secondarySoft: '#2A1F3D',
  secondaryInk: '#D8C6F0',
  onSecondary: '#FFFFFF',

  accent: '#7C3AED',
  accentSoft: '#1F1533',
  accentBorder: '#43307A',
  accentInk: '#C9B2FA',
  onAccent: '#FFFFFF',

  success: '#34D166',
  successSoft: '#10301F',
  successInk: '#6EE7A0',

  warning: '#F5A623',
  warningSoft: '#3A2A0C',
  warningInk: '#FBBF4D',

  danger: '#F0564B',
  dangerSoft: '#3A1517',
  dangerInk: '#FCA5A5',

  info: '#4C8DFF',
  infoSoft: '#15202E',
  infoInk: '#8AB4FF',

  glass: 'rgba(28,28,36,0.62)',
  glassBorder: 'rgba(255,255,255,0.14)',
  glow: 'rgba(124,58,237,0.38)',
} as const;
