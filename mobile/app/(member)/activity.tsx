import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { EmptyState, ProgressBar, SectionHeader, SkeletonBlock, Toast } from '../../src/components/ui';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { useMyBookings } from '../../src/hooks/useMe';
import { useMyWorkouts } from '../../src/hooks/useCoaching';
import { useWeeklyGoal, weekStart } from '../../src/hooks/useWeeklyGoal';
import { dateLocale } from '../../src/i18n';

const WEEKS = 8;
const WEEK_MS = 7 * 86_400_000;
const BAR_AREA = 140;

/** Détail de l'activité, depuis la carte « Activité » du profil : chiffres clés, 8 semaines, répartition, jours préférés, historique. */
export default function ActivityScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { sessions, isLoading } = useWeeklyGoal();
  const { refetch: refetchWorkouts } = useMyWorkouts();
  const { refetch: refetchBookings } = useMyBookings();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetchWorkouts(), refetchBookings()]));
  const [picked, setPicked] = useState<number | null>(null);

  const thisWeek = weekStart(new Date());
  const weeks = useMemo(() => {
    const counts = Array<number>(WEEKS).fill(0);
    for (const s of sessions) {
      const diff = Math.round((thisWeek - weekStart(s.date)) / WEEK_MS);
      if (diff >= 0 && diff < WEEKS) counts[WEEKS - 1 - diff]++;
    }
    return counts;
  }, [sessions, thisWeek]);

  const total = sessions.length;
  const max = Math.max(...weeks, 1);
  const activeWeeks = weeks.filter((c) => c > 0).length;
  const assiduity = Math.round((activeWeeks / WEEKS) * 100);
  const avg = Math.round((weeks.reduce((a, b) => a + b, 0) / WEEKS) * 10) / 10;
  const best = Math.max(...weeks);
  const streak = (() => {
    let i = WEEKS - 1;
    if (weeks[i] === 0) i--; // la semaine en cours, encore vide, n'interrompt pas la série
    let n = 0;
    while (i >= 0 && weeks[i] > 0) { n++; i--; }
    return n;
  })();
  const recent = useMemo(() => {
    const since = Date.now() - WEEK_MS;
    return sessions.filter((s) => s.date.getTime() >= since);
  }, [sessions]);
  const workouts = sessions.filter((s) => s.kind === 'workout').length;
  const classes = total - workouts;

  // Jours de la semaine (lundi = 0) sur lesquels tu t'entraînes le plus.
  const byDay = useMemo(() => {
    const d = Array<number>(7).fill(0);
    for (const s of sessions) d[(s.date.getDay() + 6) % 7]++;
    return d;
  }, [sessions]);
  const dayMax = Math.max(...byDay, 1);
  const dayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(dateLocale(), { weekday: 'narrow' })),
    [],
  );
  const weekDate = (i: number) => new Date(thisWeek - (WEEKS - 1 - i) * WEEK_MS).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });

  const kpis = [
    { icon: 'fitness-center' as const, value: String(total), label: t('member.activity_sessions') },
    { icon: 'event-available' as const, value: `${assiduity}%`, label: t('member.activity_assiduity') },
    { icon: 'local-fire-department' as const, value: `${streak}`, unit: t('member.activity_streak_unit'), label: t('member.activity_streak') },
    { icon: 'show-chart' as const, value: String(avg), label: t('member.activity_avg') },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={t('member.activity_title')} fallbackHref="/(member)/(tabs)/profile" />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {isLoading && total === 0 ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={104} radius={radii.lg} style={{ width: '48.5%' }} />)}
            </View>
            <SkeletonBlock height={220} radius={radii.lg} />
            <SkeletonBlock height={110} radius={radii.lg} />
          </View>
        ) : total === 0 ? (
          <EmptyState icon="insights" title={t('member.activity_empty_title')} text={t('member.activity_empty_text')} tone="muted" />
        ) : (
          <>
            <View style={styles.kpiGrid}>
              {kpis.map((k) => (
                <View key={k.label} style={[styles.kpi, cardShadow]}>
                  <View style={styles.kpiIcon}><MaterialIcons name={k.icon} size={18} color="#FFFFFF" /></View>
                  <Text style={styles.kpiValue}>{k.value}{k.unit ? <Text style={styles.kpiUnit}> {k.unit}</Text> : null}</Text>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                </View>
              ))}
            </View>

            <SectionHeader title={t('member.activity_weeks')} style={styles.section} />
            <View style={[styles.card, cardShadow]}>
              <View style={styles.bars}>
                {weeks.map((count, i) => {
                  const last = i === WEEKS - 1;
                  const on = picked === i;
                  const h = Math.max(8, Math.round((count / max) * BAR_AREA));
                  return (
                    <Pressable key={i} style={styles.barCol} onPress={() => setPicked(on ? null : i)} accessibilityLabel={`${t('member.activity_week_n', { date: weekDate(i) })} : ${count}`}>
                      <Text style={[styles.barValue, (on || last) && { color: colors.text }]}>{count}</Text>
                      <LinearGradient colors={[colors.deep, colors.deepPressed]} style={[styles.bar, { height: h, opacity: on || last ? 1 : 0.5 }]} />
                      <Text style={[styles.barLabel, on && { color: colors.text }]}>{weekDate(i).split(' ')[0]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.caption}>
                {picked !== null ? `${t('member.activity_week_n', { date: weekDate(picked) })} · ${weeks[picked]}` : t('member.activity_best', { count: best })}
              </Text>
            </View>

            <SectionHeader title={t('member.activity_split')} style={styles.section} />
            <View style={[styles.card, cardShadow, { gap: 14 }]}>
              {[
                { icon: 'fitness-center' as const, label: t('member.activity_workouts'), n: workouts },
                { icon: 'groups' as const, label: t('member.activity_classes'), n: classes },
              ].map((r) => (
                <View key={r.label} style={{ gap: 8 }}>
                  <View style={styles.splitHead}>
                    <MaterialIcons name={r.icon} size={18} color={colors.deep} />
                    <Text style={styles.splitLabel}>{r.label}</Text>
                    <Text style={styles.splitValue}>{r.n}</Text>
                  </View>
                  <ProgressBar progress={r.n / Math.max(1, total)} color={colors.deep} />
                </View>
              ))}
            </View>

            <SectionHeader title={t('member.activity_days')} style={styles.section} />
            <View style={[styles.card, cardShadow, styles.days]}>
              {byDay.map((n, i) => (
                <View key={i} style={styles.dayCol}>
                  <View style={styles.dayTrack}>
                    <View style={[styles.dayFill, { height: `${Math.round((n / dayMax) * 100)}%`, opacity: n === dayMax ? 1 : 0.55 }]} />
                  </View>
                  <Text style={styles.dayLabel}>{dayLabels[i]}</Text>
                </View>
              ))}
            </View>

            <SectionHeader title={t('member.activity_history')} style={styles.section} />
            <View style={{ gap: 10 }}>
              {recent.length === 0 ? <Text style={styles.caption}>{t('member.activity_history_none')}</Text> : null}
              {recent.map((s) => (
                <Pressable key={s.id} onPress={() => router.push(s.href as never)} style={({ pressed }) => [styles.row, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}>
                  <View style={styles.rowIcon}>
                    <MaterialIcons name={s.kind === 'class' ? 'groups' : 'fitness-center'} size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{s.title || t(s.kind === 'class' ? 'member.goal_class' : 'member.goal_workout')}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {[s.date.toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' }), s.subtitle].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
                </Pressable>
              ))}
              <Pressable onPress={() => router.push('/(member)/history' as never)} accessibilityRole="button" style={({ pressed }) => [styles.allButton, pressed && { opacity: 0.7 }]}>
                <Text style={styles.allButtonText}>{t('member.activity_history_all')}</Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.primaryInk} />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
      {offlineToastVisible ? <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} /> : null}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 4, gap: 12, paddingBottom: 80 },
    section: { marginTop: 14, marginBottom: 2 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    kpi: { width: '48.5%', padding: 16, gap: 4, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    kpiIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    kpiValue: { fontFamily: fonts.head, fontSize: 30, letterSpacing: -1, color: colors.text },
    kpiUnit: { fontFamily: fonts.bodySemiBold, fontSize: 13, letterSpacing: 0, color: colors.muted },
    kpiLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted },
    card: { padding: 16, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: BAR_AREA + 44 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
    bar: { width: '100%', borderRadius: 8 },
    barValue: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
    barLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
    caption: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 14 },
    splitHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    splitLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    splitValue: { fontFamily: fonts.head, fontSize: 16, color: colors.text },
    days: { flexDirection: 'row', gap: 8, height: 130, alignItems: 'stretch' },
    dayCol: { flex: 1, alignItems: 'center', gap: 8 },
    dayTrack: { flex: 1, width: '100%', borderRadius: 8, backgroundColor: colors.surface2, justifyContent: 'flex-end', overflow: 'hidden' },
    dayFill: { width: '100%', backgroundColor: colors.deep, borderRadius: 8 },
    dayLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    rowIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.deep },
    allButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
    allButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    rowMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  });
}
