/** Tokens de design — alignés sur Design System/Muscle UP Design System v2.dc.html */
export const colors = {
  bg: '#F7F6FA',
  surface: '#FFFFFF',
  surface2: '#F0EFF5',
  text: '#0E0D12',
  muted: '#5C5B69',
  border: '#E7E5EF',
  borderStrong: '#CFC9E2',

  primary: '#7C3AED',
  primaryHover: '#7033D6',
  primaryPressed: '#6A2FCB',
  primarySoft: '#EFE9FD',
  primaryBorder: '#D8C8FA',
  primaryInk: '#572AA6',
  primaryContrast: '#FFFFFF',

  secondary: '#3B1764',
  secondarySoft: '#EDE5F7',
  secondaryInk: '#3B1764',
  onSecondary: '#FFFFFF',

  accent: '#7C3AED',
  accentSoft: '#EFE9FD',
  accentBorder: '#D8C8FA',
  accentInk: '#572AA6',
  onAccent: '#FFFFFF',

  success: '#16A34A',
  successSoft: '#E3F6EA',
  successInk: '#0F6B33',

  warning: '#F59E0B',
  warningSoft: '#FEF3DC',
  warningInk: '#7A4B00',

  danger: '#DC2626',
  dangerSoft: '#FCE8E8',
  dangerInk: '#A71818',

  info: '#2563EB',
  infoSoft: '#E9EFFD',
  infoInk: '#1D4ED8',

  /** Verre dépoli (barre d'onglets flottante, modales) et lueur d'accent — dérivée du primary par le thème. */
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.95)',
  glow: 'rgba(124,58,237,0.28)',
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Hauteur standard des contrôles (inputs, boutons pleine largeur) — cf. --ctl des maquettes */
export const controlHeight = 52;

export const fonts = {
  head: 'Sora_800ExtraBold',
  headBold: 'Sora_700Bold',
  headSemiBold: 'Sora_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;

/** Échelle typographique v2 (pt) — titres serrés, chiffres clés grands. */
export const typography = {
  largeTitle: { fontFamily: fonts.head, fontSize: 34, letterSpacing: -1 },
  keyFigure: { fontFamily: fonts.head, fontSize: 56, letterSpacing: -2.5, lineHeight: 56 },
  title: { fontFamily: fonts.headBold, fontSize: 20, letterSpacing: -0.4 },
  body: { fontFamily: fonts.body, fontSize: 16 },
  callout: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  caption: { fontFamily: fonts.bodyBold, fontSize: 12 },
} as const;

/** Ombre de carte : douce à deux couches en clair, aucune en sombre (bordure 1 px à la place). */
export const cardShadow = {
  shadowColor: '#140A28',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 14,
  elevation: 2,
} as const;
