import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { LineChart } from '../ui';

interface ExerciseRecordCardProps {
  bestWeight: number;
  bestReps: number;
  deltaKg: number | null;
  weeksSpan: number | null;
  series: number[];
}

/** Carte "record" avec mini-sparkline — Fiche exercice, FitZone App Entraînement.dc.html, E3. */
export function ExerciseRecordCard({ bestWeight, bestReps, deltaKg, weeksSpan, series }: ExerciseRecordCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Mon record</Text>
        <Text style={styles.value}>{bestWeight} kg × {bestReps}</Text>
        {deltaKg !== null && weeksSpan !== null ? (
          <Text style={[styles.delta, { color: deltaKg >= 0 ? colors.successInk : colors.dangerInk }]}>
            {deltaKg >= 0 ? '+' : ''}{deltaKg} kg en {weeksSpan} semaine{weeksSpan > 1 ? 's' : ''}
          </Text>
        ) : null}
      </View>
      {series.length >= 2 ? (
        <View style={styles.sparkline}>
          <LineChart points={series} labels={[]} height={44} />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md,
      borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
    },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
    value: { fontFamily: fonts.head, fontSize: 19, color: colors.text },
    delta: { fontFamily: fonts.bodySemiBold, fontSize: 12 },
    sparkline: { width: 90 },
  });
}
