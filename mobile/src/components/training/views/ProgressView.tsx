import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radii, spacing } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useBodyMetrics } from '../../../hooks/useProgress';
import { useMyWorkouts } from '../../../hooks/useCoaching';
import { BarHistogram, EmptyState, LineChart } from '../../ui';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { MONTHS_SHORT } from '../../../i18n/labels';

const MONTH_LABELS = MONTHS_SHORT;

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

const MEASUREMENT_LABELS: Record<string, string> = {
  get waist() { return i18n.t('member.tour_de_taille'); },
  get bodyFat() { return i18n.t('member.masse_grasse'); },
  get arm() { return i18n.t('member.tour_de_bras'); },
};
const MEASUREMENT_UNITS: Record<string, string> = { waist: 'cm', bodyFat: '%', arm: 'cm' };

/** Vue "Progression" de l'onglet Entraînement — FitZone App Entraînement.dc.html, F1. */
export function ProgressView() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: metrics, isLoading, isError, refetch } = useBodyMetrics();

  // Régularité : dates des séances d'entraînement enregistrées (le backend n'expose pas de calendrier de présence).
  const { data: workouts } = useMyWorkouts();
  const attendanceDates = useMemo(() => workouts?.map((w) => w.date), [workouts]);

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

  // Série en cours : semaines consécutives avec au moins une séance, en remontant depuis la plus récente
  // (la semaine courante vide n'interrompt pas la série tant qu'elle n'est pas terminée).
  const streak = useMemo(() => {
    let i = weeklyRegularity.length - 1;
    if (i >= 0 && weeklyRegularity[i] === 0) i--;
    let count = 0;
    while (i >= 0 && weeklyRegularity[i] > 0) {
      count++;
      i--;
    }
    return { streak: count };
  }, [weeklyRegularity]);

  if (isLoading) return null;

  if (isError && !metrics) {
    return (
      <EmptyState
        icon="cloud-off"
        title={t('member.progression_indisponible')}
        text={t('member.impossible_de_recuperer_vos_mesures')}
        tone="danger"
        actionLabel={t('common.reessayer')}
        onAction={() => refetch()}
      />
    );
  }

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
          title={t('member.votre_courbe_commence_ici')}
          text={t('member.ajoutez_une_premiere_mesure_poids')}
          tone="primary"
        />
        <Pressable style={styles.addButton} onPress={() => router.push('/(member)/measure')}>
          <Text style={styles.addButtonText}>{t('member.ajouter_ma_premiere_mesure')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.weightCard}>
        <View style={styles.weightHeaderRow}>
          <View>
            <Text style={styles.weightValue}>{t('member.kg_5', { v0: latest?.weightKg ?? '—' })}</Text>
            {weightDelta !== null ? (
              <Text style={[styles.weightDelta, { color: weightDelta <= 0 ? colors.successInk : colors.warningInk }]}>{t('member.kg_sur_la_periode', { v1: weightDelta > 0 ? '+' : '', v2: weightDelta.toFixed(1) })}</Text>
            ) : null}
          </View>
          <Pressable style={styles.addMeasureButton} onPress={() => router.push('/(member)/measure')}>
            <MaterialIcons name="add" size={18} color={colors.primaryInk} />
            <Text style={styles.addMeasureText}>{t('member.mesure')}</Text>
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
            <Text style={styles.regularityTitle}>{t('member.semaine_daffilee', { v0: streak?.streak ?? 0, v2: (streak?.streak ?? 0) > 1 ? 's' : '' })}</Text>
            <Text style={styles.regularitySub}>{t('member.regularite_des_8_dernieres_semaines')}</Text>
          </View>
        </View>
        {weeklyRegularity.length > 0 ? (
          <BarHistogram values={weeklyRegularity} highlightIndex={weeklyRegularity.length - 1} />
        ) : null}
      </View>

      <Pressable style={styles.photosLink} onPress={() => router.push('/(member)/photos')}>
        <MaterialIcons name="photo-library" size={18} color={colors.text} />
        <Text style={styles.photosLinkText}>{t('member.mes_photos_de_progression')}</Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    weightCard: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
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
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
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
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    photosLinkText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  });
}
