/** Tokens de design — alignés sur Design System/FitZone Design System.dc.html */
export const colors = {
  bg: '#F7F7F9',
  surface: '#FFFFFF',
  surface2: '#F1F2F4',
  text: '#111827',
  muted: '#5B6270',
  border: '#E3E4E7',
  borderStrong: '#C5C8CE',

  primary: '#6D28D9',
  primaryHover: '#5F21BE',
  primaryPressed: '#511BA3',
  primarySoft: '#F1EAFB',
  primaryBorder: '#D5C2F3',
  primaryInk: '#5B21B6',
  primaryContrast: '#FFFFFF',

  secondary: '#3B1764',
  secondarySoft: '#EDE5F7',
  secondaryInk: '#3B1764',
  onSecondary: '#FFFFFF',

  accent: '#6D28D9',
  accentSoft: '#F1EAFB',
  accentBorder: '#D5C2F3',
  accentInk: '#5B21B6',
  onAccent: '#FFFFFF',

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
  xs: 5,
  sm: 9,
  md: 16,
  lg: 22,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Hauteur standard des contrôles (inputs, boutons pleine largeur) — cf. --ctl des maquettes */
export const controlHeight = 48;

export const fonts = {
  head: 'Sora_800ExtraBold',
  headBold: 'Sora_700Bold',
  headSemiBold: 'Sora_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;
