import { colors } from './tokens';

type ColorPalette = { [K in keyof typeof colors]: string };

/** Palette sombre — même forme que `colors` (drop-in), cf. moteur de thème (ThemeContext). */
export const darkColors: ColorPalette = {
  bg: '#0E1117',
  surface: '#1A1F2B',
  surface2: '#222838',
  text: '#F3F4F6',
  muted: '#9AA1AE',
  border: '#2A3040',
  borderStrong: '#3A4152',

  primary: '#8B5CF6',
  primaryHover: '#9D72F8',
  primaryPressed: '#7C4FE0',
  primarySoft: '#241A3D',
  primaryBorder: '#4A3573',
  primaryInk: '#C4B0FA',
  primaryContrast: '#FFFFFF',

  secondary: '#2B1049',
  secondarySoft: '#2A1F3D',
  secondaryInk: '#D8C6F0',
  onSecondary: '#F3F4F6',

  accent: '#8B5CF6',
  accentSoft: '#241A3D',
  accentBorder: '#4A3573',
  accentInk: '#C4B0FA',
  onAccent: '#FFFFFF',

  success: '#34D166',
  successSoft: '#12291B',
  successInk: '#5CE08A',

  warning: '#F5A623',
  warningSoft: '#2E2410',
  warningInk: '#FFC860',

  danger: '#F0564B',
  dangerSoft: '#2E1515',
  dangerInk: '#FF8178',

  info: '#4C8DFF',
  infoSoft: '#15202E',
  infoInk: '#8AB4FF',
} as const;
