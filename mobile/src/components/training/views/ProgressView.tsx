import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radii, spacing } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useBodyMetrics } from '../../../hooks/useProgress';
import { useMyWorkouts } from '../../../hooks/useCoaching';
import { BarHistogram, EmptyState, LineChart, SectionHeader, SkeletonBlock } from '../../ui';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../../i18n';
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
const MEASUREMENT_ICONS: Record<'waist' | 'arm' | 'bodyFat', keyof typeof MaterialIcons.glyphMap> = { waist: 'straighten', arm: 'fitness-center', bodyFat: 'percent' };

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

  if (isLoading) {
    return (
      <View style={{ gap: spacing.md }}>
        <SkeletonBlock height={150} radius={radii.xl} />
        <SkeletonBlock height={200} radius={radii.lg} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} height={110} radius={radii.lg} style={{ flex: 1 }} />)}
        </View>
      </View>
    );
  }

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

  // Dernière valeur connue de chaque mesure (un enregistrement peut n'en contenir qu'une partie), et la précédente pour l'écart.
  const lastTwo = (pick: (m: NonNullable<typeof metrics>[number]) => number | null) => {
    const found: { value: number; date: string }[] = [];
    for (const m of metrics ?? []) {
      const v = pick(m);
      if (v != null && !Number.isNaN(v)) found.push({ value: v, date: m.date });
      if (found.length === 2) break;
    }
    return { latest: found[0], previous: found[1] };
  };
  const weight = lastTwo((m) => (m.weightKg ? Number(m.weightKg) : null));
  const weightDelta = weight.latest && weight.previous ? weight.latest.value - weight.previous.value : null;

  const secondary = (['waist', 'arm', 'bodyFat'] as const)
    .map((key) => ({ key, ...lastTwo((m) => m.measurements?.[key] ?? null) }))
    .filter((x) => x.latest);

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

  const fmtDelta = (d: number) => `${d > 0 ? '+' : ''}${d.toFixed(1)}`;

  return (
    <View style={{ gap: spacing.md }}>
      {weight.latest ? (
        <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroDeco} />
          <Text style={styles.heroLabel}>{t('member.progress_current_weight')}</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroValue}>{weight.latest.value}<Text style={styles.heroUnit}> kg</Text></Text>
            {weightDelta !== null ? (
              <View style={styles.deltaPill}>
                <MaterialIcons name={weightDelta <= 0 ? 'trending-down' : 'trending-up'} size={16} color="#FFFFFF" />
                <Text style={styles.deltaText}>{fmtDelta(weightDelta)} kg</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroDate}>{t('member.progress_updated', { date: new Date(weight.latest.date).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' }) })}</Text>
        </LinearGradient>
      ) : null}

      {weightSeries.length >= 2 ? (
        <View style={{ gap: 10 }}>
          <SectionHeader title={t('member.progress_evolution')} />
          <View style={styles.card}>
            <LineChart
              color={colors.deep}
              points={weightSeries.map((p) => p.weight)}
              labels={weightSeries.length > 4
                ? [weightSeries[0], weightSeries[Math.floor(weightSeries.length / 2)], weightSeries[weightSeries.length - 1]].map((p) => MONTH_LABELS[p.date.getMonth()])
                : weightSeries.map((p) => MONTH_LABELS[p.date.getMonth()])}
            />
          </View>
        </View>
      ) : null}

      {secondary.length > 0 ? (
        <View style={{ gap: 10 }}>
          <SectionHeader title={t('member.progress_measurements')} />
          <View style={styles.tiles}>
            {secondary.map(({ key, latest, previous }) => {
              const d = latest && previous ? latest.value - previous.value : null;
              return (
                <View key={key} style={styles.tile}>
                  <View style={styles.tileTop}>
                    <View style={styles.tileIcon}>
                      <MaterialIcons name={MEASUREMENT_ICONS[key]} size={22} color="#FFFFFF" />
                    </View>
                    {d !== null && d !== 0 ? (
                      <View style={[styles.tileDeltaPill, { backgroundColor: d < 0 ? colors.successSoft : colors.warningSoft }]}>
                        <MaterialIcons name={d < 0 ? 'arrow-downward' : 'arrow-upward'} size={11} color={d < 0 ? colors.successInk : colors.warningInk} />
                        <Text style={[styles.tileDelta, { color: d < 0 ? colors.successInk : colors.warningInk }]}>{Math.abs(d).toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.tileValue}>{latest!.value}<Text style={styles.tileUnit}> {MEASUREMENT_UNITS[key]}</Text></Text>
                  <Text style={styles.tileLabel} numberOfLines={2}>{MEASUREMENT_LABELS[key].replace(/ ([^ ]+)$/, '\n$1')}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <SectionHeader title={t('member.progress_regularity')} />
        <View style={[styles.card, { gap: spacing.md }]}>
          <View style={styles.regularityHeaderRow}>
            <LinearGradient colors={[colors.deep, colors.deepPressed]} style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>{streak?.streak ?? 0}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.regularityTitle}>{t('member.semaine_daffilee', { v0: streak?.streak ?? 0, v2: (streak?.streak ?? 0) > 1 ? 's' : '' })}</Text>
              <Text style={styles.regularitySub}>{t('member.regularite_des_8_dernieres_semaines')}</Text>
            </View>
          </View>
          {weeklyRegularity.length > 0 ? (
            <BarHistogram values={weeklyRegularity} highlightIndex={weeklyRegularity.length - 1} color={colors.deepPressed} highlightColor={colors.deep} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    hero: { borderRadius: radii.xl, padding: 22, overflow: 'hidden', gap: 4 },
    heroDeco: { position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.08)' },
    heroLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' },
    heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    heroValue: { fontFamily: fonts.display, fontSize: 52, lineHeight: 58, letterSpacing: -1.5, color: '#FFFFFF' },
    heroUnit: { fontFamily: fonts.bodyBold, fontSize: 20, letterSpacing: 0, color: 'rgba(255,255,255,0.75)' },
    deltaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
    deltaText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
    heroDate: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    tiles: { flexDirection: 'row', gap: 10 },
    tile: { flex: 1, minWidth: 0, overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 3 },
    tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 6 },
    tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.deep },
    tileValue: { fontFamily: fonts.head, fontSize: 22, letterSpacing: -0.6, color: colors.text },
    tileUnit: { fontFamily: fonts.bodySemiBold, fontSize: 12, letterSpacing: 0, color: colors.muted },
    tileLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 15, color: colors.muted },
    tileDeltaPill: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 1, height: 22, paddingHorizontal: 5, borderRadius: 11 },
    tileDelta: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
    regularityHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    streakBadge: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    streakBadgeText: { fontFamily: fonts.display, fontSize: 20, color: '#FFFFFF' },
    regularityTitle: { fontFamily: fonts.headBold, fontSize: 15, color: colors.text },
    regularitySub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    addButton: { height: 52, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    addButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
  });
}
