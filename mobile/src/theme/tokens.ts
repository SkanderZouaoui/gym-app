/** Tokens de design — alignés sur Design System/Muscle UP Design System v2.dc.html */
export const colors = {
  bg: '#F5F5F6',
  surface: '#FFFFFF',
  surface2: '#EEEEF0',
  text: '#0A0A0A',
  muted: '#5F5F66',
  border: '#E4E4E7',
  borderStrong: '#CFCFD4',

  /** Cartes héros : violet foncé (dégradé hero → hero2). */
  hero: '#5B21B6',
  hero2: '#2E1065',

  /** Violet foncé : graphiques, badges et anneau de profil. */
  deep: '#5B21B6',
  deepPressed: '#3B1764',

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

/** Une seule famille (Inter), déclinée en graisses — voir le chargement dans app/_layout.tsx. */
export const fonts = {
  head: 'Inter_800ExtraBold',
  headBold: 'Inter_700Bold',
  headSemiBold: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  /** Grands titres (pages, accroches) : Inter Black, capitales. */
  display: 'Inter_900Black',
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
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 14,
  elevation: 2,
} as const;
