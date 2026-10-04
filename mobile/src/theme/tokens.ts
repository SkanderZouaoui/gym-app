/** Tokens de design — alignés sur Design System/FitZone Design System.dc.html */
export const colors = {
  bg: '#F7F7F9',
  surface: '#FFFFFF',
  surface2: '#F1F2F4',
  text: '#111827',
  muted: '#5B6270',
  border: '#E3E4E7',
  borderStrong: '#C5C8CE',

  primary: '#FF5A1F',
  primaryHover: '#E6511C',
  primaryPressed: '#CC4819',
  primarySoft: '#FFEEE9',
  primaryBorder: '#FFC6B1',
  primaryInk: '#B83A0C',
  primaryContrast: '#FFFFFF',

  secondary: '#14213D',
  secondarySoft: '#E8E9EC',
  secondaryInk: '#14213D',
  onSecondary: '#FFFFFF',

  accent: '#FCA311',
  accentSoft: '#FFF6E7',
  accentBorder: '#FEDCA6',
  accentInk: '#8A5600',
  onAccent: '#111111',

  success: '#16A34A',
  successSoft: '#E8F6ED',
  successInk: '#11793A',

  warning: '#F59E0B',
  warningSoft: '#FEF5E7',
  warningInk: '#8A5600',

  danger: '#DC2626',
  dangerSoft: '#FCE9E9',
  dangerInk: '#B91C1C',

  info: '#2563EB',
  infoSoft: '#E9EFFD',
  infoInk: '#1D4ED8',
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fonts = {
  head: 'Sora_800ExtraBold',
  headBold: 'Sora_700Bold',
  headSemiBold: 'Sora_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;
