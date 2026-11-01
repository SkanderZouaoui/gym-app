import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export interface DayStat {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  label: string;
}

/** Bilan de la journée affichée : trois chiffres clés côte à côte (cours, inscrits, remplissage ou présents). */
export function DayStats({ stats }: { stats: DayStat[] }) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.card, cardShadow]}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.cell, i > 0 && styles.divider]}>
          <View style={styles.icon}>
            <MaterialIcons name={s.icon} size={16} color={colors.primaryInk} />
          </View>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.value}</Text>
          <Text style={styles.label} numberOfLines={1}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, paddingVertical: 12 },
    cell: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
    divider: { borderStartWidth: StyleSheet.hairlineWidth, borderStartColor: colors.border },
    icon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    value: { fontFamily: fonts.head, fontSize: 22, letterSpacing: -0.6, color: colors.text },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.muted },
  });
}
