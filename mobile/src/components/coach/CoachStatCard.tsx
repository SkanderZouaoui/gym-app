import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type StatTone = 'secondary' | 'success' | 'accent' | 'warning' | 'danger';

/** Carte de statistique courte (grille 3 colonnes) — Accueil Coach, FitZone App Coach.dc.html I1. */
export function CoachStatCard({ value, label, tone = 'secondary' }: { value: string; label: string; tone?: StatTone }) {
  const { colors } = useTheme();
  const { styles, toneStyles } = useMemo(() => makeStyles(colors), [colors]);
  const t = toneStyles[tone];
  return (
    <View style={[styles.card, { backgroundColor: t.bg }]}>
      <Text style={[styles.value, { color: t.ink }]}>{value}</Text>
      <Text style={[styles.label, { color: t.ink }]}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const toneStyles: Record<StatTone, { bg: string; ink: string }> = {
    secondary: { bg: colors.secondarySoft, ink: colors.secondaryInk },
    success: { bg: colors.successSoft, ink: colors.successInk },
    accent: { bg: colors.accentSoft, ink: colors.accentInk },
    warning: { bg: colors.warningSoft, ink: colors.warningInk },
    danger: { bg: colors.dangerSoft, ink: colors.dangerInk },
  };
  const styles = StyleSheet.create({
    card: { flex: 1, borderRadius: radii.sm, padding: 10, gap: 2 },
    value: { fontFamily: fonts.head, fontSize: 20 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
  });
  return { styles, toneStyles };
}
