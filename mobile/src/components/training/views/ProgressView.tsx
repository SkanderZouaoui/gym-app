import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radii, spacing } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useBodyMetrics, useAttendanceCalendar } from '../../../hooks/useProgress';
import { useStreak } from '../../../hooks/useLoyalty';
import { BarHistogram, EmptyState, LineChart } from '../../ui';
import { MaterialIcons } from '@expo/vector-icons';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

const MEASUREMENT_LABELS: Record<string, string> = {
  waist: 'Tour de taille',
  bodyFat: 'Masse grasse',
  arm: 'Tour de bras',
};
const MEASUREMENT_UNITS: Record<string, string> = { waist: 'cm', bodyFat: '%', arm: 'cm' };

/** Vue "Progression" de l'onglet Entraînement — FitZone App Entraînement.dc.html, F1. */
export function ProgressView() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: metrics, isLoading } = useBodyMetrics();
  const { data: streak } = useStreak();

  const eightWeeksAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 56);
    return d;
  }, []);
  const { data: attendanceDates } = useAttendanceCalendar(
    eightWeeksAgo.toISOString().slice(0, 10),
    new Date().toISOString().slice(0, 10),
  );

  const weightSeries = useMemo(() => {
    if (!metrics) return [];
    return metrics
      .filter((m) => m.weightKg)
      .slice()
      .reverse()
      .map((m) => ({ date: new Date(m.date), weight: Number(m.weightKg) }));
  }, [metrics]);

  const weeklyRegularity = useMemo(() => {
    if (!attendanceDates) return [];
    const weeks: number[] = Array(8).fill(0);
    const now = startOfWeek(new Date());
    for (const dateStr of attendanceDates) {
      const weekStart = startOfWeek(new Date(dateStr));
      const diffWeeks = Math.round((now.getTime() - weekStart.getTime()) / (7 * 86_400_000));
      if (diffWeeks >= 0 && diffWeeks < 8) weeks[7 - diffWeeks]++;
    }
    return weeks;
  }, [attendanceDates]);

  if (isLoading) return null;

  const latest = metrics?.[0];
  const previous = metrics?.[1];
  const weightDelta = latest?.weightKg && previous?.weightKg ? Number(latest.weightKg) - Number(previous.weightKg) : null;

  const secondaryMeasurements = latest?.measurements
    ? Object.entries(latest.measurements).filter(([key]) => key in MEASUREMENT_LABELS)
    : [];

  if (!metrics || metrics.length === 0) {
    return (
      <View style={{ gap: spacing.sm }}>
        <EmptyState
          icon="monitor"
          title="Votre courbe commence ici"
          text="Ajoutez une première mesure (poids, tour de taille…) pour suivre votre évolution semaine après semaine."
          tone="primary"
        />
        <Pressable style={styles.addButton} onPress={() => router.push('/(member)/measure')}>
          <Text style={styles.addButtonText}>Ajouter ma première mesure</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.weightCard}>
        <View style={styles.weightHeaderRow}>
          <View>
            <Text style={styles.weightValue}>{latest?.weightKg ?? '—'} kg</Text>
            {weightDelta !== null ? (
              <Text style={[styles.weightDelta, { color: weightDelta <= 0 ? colors.successInk : colors.warningInk }]}>
                {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg sur la période
              </Text>
            ) : null}
          </View>
          <Pressable style={styles.addMeasureButton} onPress={() => router.push('/(member)/measure')}>
            <MaterialIcons name="add" size={18} color={colors.primaryInk} />
            <Text style={styles.addMeasureText}>Mesure</Text>
          </Pressable>
        </View>
        {weightSeries.length >= 2 ? (
          <LineChart
            points={weightSeries.map((p) => p.weight)}
            labels={weightSeries.length > 4
              ? [weightSeries[0], weightSeries[Math.floor(weightSeries.length / 2)], weightSeries[weightSeries.length - 1]].map((p) => MONTH_LABELS[p.date.getMonth()])
              : weightSeries.map((p) => MONTH_LABELS[p.date.getMonth()])}
          />
        ) : null}
      </View>

      {secondaryMeasurements.length > 0 ? (
        <View style={styles.measurementsRow}>
          {secondaryMeasurements.map(([key, value]) => (
            <View key={key} style={styles.measurementCard}>
              <Text style={styles.measurementLabel}>{MEASUREMENT_LABELS[key]}</Text>
              <Text style={styles.measurementValue}>{value} {MEASUREMENT_UNITS[key]}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.regularityCard}>
        <View style={styles.regularityHeaderRow}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>{streak?.streak ?? 0}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.regularityTitle}>{streak?.streak ?? 0} semaine{(streak?.streak ?? 0) > 1 ? 's' : ''} d'affilée</Text>
            <Text style={styles.regularitySub}>Régularité des 8 dernières semaines</Text>
          </View>
        </View>
        {weeklyRegularity.length > 0 ? (
          <BarHistogram values={weeklyRegularity} highlightIndex={weeklyRegularity.length - 1} />
        ) : null}
      </View>

      <Pressable style={styles.photosLink} onPress={() => router.push('/(member)/photos')}>
        <MaterialIcons name="photo-library" size={18} color={colors.text} />
        <Text style={styles.photosLinkText}>Mes photos de progression</Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    weightCard: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: spacing.sm,
    },
    weightHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    weightValue: { fontFamily: fonts.head, fontSize: 30, color: colors.text },
    weightDelta: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginTop: 2 },
    addMeasureButton: {
      flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 12,
      borderRadius: 999, backgroundColor: colors.primarySoft,
    },
    addMeasureText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.primaryInk },
    measurementsRow: { flexDirection: 'row', gap: spacing.sm },
    measurementCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
      padding: spacing.sm, gap: 2,
    },
    measurementLabel: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted },
    measurementValue: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
    regularityCard: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: spacing.md,
    },
    regularityHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    streakBadge: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    },
    streakBadgeText: { fontFamily: fonts.headBold, fontSize: 17, color: colors.onAccent },
    regularityTitle: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
    regularitySub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    addButton: { height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    addButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
    photosLink: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
      borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    photosLinkText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  });
}
