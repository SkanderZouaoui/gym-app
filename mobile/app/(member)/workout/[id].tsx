import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme, type ColorPalette } from '../../../src/theme/ThemeContext';
import { useMyWorkouts } from '../../../src/hooks/useCoaching';
import { ScreenTitle, Toast } from '../../../src/components/ui';
import { WorkoutHeroCard } from '../../../src/components/training/WorkoutHeroCard';
import { formatClock, workoutSeconds } from '../../../src/utils/duration';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../../src/i18n';
import { WEEKDAYS_LONG_SUN } from '../../../src/i18n/labels';

const FEELING_STYLES: Record<string, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: (c: ColorPalette) => string; bg: (c: ColorPalette) => string }> = {
  EASY: { get label() { return i18n.t('member.facile'); }, icon: 'sentiment-very-satisfied', color: (c) => c.successInk, bg: (c) => c.successSoft },
  OK: { get label() { return i18n.t('member.correct'); }, icon: 'sentiment-satisfied', color: (c) => c.infoInk, bg: (c) => c.infoSoft },
  HARD: { get label() { return i18n.t('member.difficile'); }, icon: 'sentiment-dissatisfied', color: (c) => c.dangerInk, bg: (c) => c.dangerSoft },
};

const DAY_LABELS = WEEKDAYS_LONG_SUN;

/** Détail d'une séance de l'historique — lecture seule, même mise en page
 * que la séance guidée (session/live) mais sans aucune saisie ni action. */
export default function WorkoutDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: workouts, isLoading, refetch } = useMyWorkouts();
  const log = workouts?.find((w) => w.id === id);
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);

  const exerciseGroups = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof log>['sets']>();
    if (!log) return [];
    for (const s of log.sets) {
      if (!groups.has(s.exerciseId)) groups.set(s.exerciseId, []);
      groups.get(s.exerciseId)!.push(s);
    }
    return Array.from(groups.entries());
  }, [log]);

  if (isLoading || !log) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const volume = log.sets.reduce((sum, st) => sum + (Number(st.weightKg) || 0) * (st.reps ?? 0), 0);
  const feeling = log.feeling ? FEELING_STYLES[log.feeling] : undefined;
  const title = log.program
    ? `${log.program.name}${log.day ? ` · ${log.day.label ?? DAY_LABELS[log.day.dayOfWeek]}` : ''}`
    : log.sets[0]?.exercise.name ?? t('member.seance');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.topBar}>
          <Pressable
            style={styles.back}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/training'))}
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
            <Text style={styles.backText}>{t('member.historique')}</Text>
          </Pressable>
          <View style={styles.readOnlyPill}>
            <MaterialIcons name="lock" size={14} color={colors.muted} />
            <Text style={styles.readOnlyPillText}>{t('member.lecture_seule')}</Text>
          </View>
        </View>

        <ScreenTitle
          title={title}
          subtitle={new Date(log.date).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}
        />

        <WorkoutHeroCard
          duration={workoutSeconds(log) !== null ? formatClock(workoutSeconds(log)!) : '—'}
          progress={1}
          ringLabel="100%"
          volume={volume > 0 ? `${Math.round(volume).toLocaleString(dateLocale())} kg` : '—'}
          sets={String(log.sets.length)}
        />

        {feeling ? (
          <View style={[styles.feelingBadge, { backgroundColor: feeling.bg(colors) }]}>
            <MaterialIcons name={feeling.icon} size={16} color={feeling.color(colors)} />
            <Text style={[styles.feelingText, { color: feeling.color(colors) }]}>{t('member.ressenti_2', { label: feeling.label })}</Text>
          </View>
        ) : log.feeling ? (
          <View style={[styles.feelingBadge, { backgroundColor: colors.surface2 }]}>
            <Text style={[styles.feelingText, { color: colors.text }]}>{t('member.ressenti_3', { feeling: log.feeling })}</Text>
          </View>
        ) : null}

        {exerciseGroups.map(([exId, exSets]) => (
          <View key={exId} style={[styles.exerciseCard, cardShadow]}>
            <Pressable style={styles.exerciseHeaderRow} onPress={() => router.push(`/(member)/exercises/${exId}`)}>
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exerciseThumb}>
                <MaterialIcons name="fitness-center" size={24} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.exerciseName} numberOfLines={1}>{exSets[0]?.exercise.name}</Text>
                <Text style={styles.exerciseMeta}>{t('member.serie_3', { length: exSets.length, v2: exSets.length > 1 ? 's' : '' })}</Text>
              </View>
              <View style={styles.doneTag}>
                <Text style={styles.doneTagText}>{exSets.length}/{exSets.length}</Text>
              </View>
            </Pressable>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 34 }]}>{t('member.serie_2')}</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>{t('member.kg_2')}</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>{t('member.reps')}</Text>
              <View style={{ width: 44 }} />
            </View>
            {exSets.map((st) => (
              <View key={st.id} style={styles.row}>
                <Text style={styles.setNumber}>{st.setNumber}</Text>
                <Text style={styles.readValue}>{st.weightKg ? Number(st.weightKg).toString() : '—'}</Text>
                <Text style={styles.readValue}>{st.reps ?? '—'}</Text>
                <View style={styles.check}>
                  <MaterialIcons name="check-circle" size={26} color={colors.successInk} />
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.xs },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    readOnlyPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: radii.full, backgroundColor: colors.surface2,
    },
    readOnlyPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
    feelingBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
      height: 36, paddingHorizontal: 14, borderRadius: radii.full,
    },
    feelingText: { fontFamily: fonts.bodyBold, fontSize: 13 },
    exerciseCard: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      padding: 14, gap: 8,
    },
    exerciseHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    exerciseThumb: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    exerciseName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, textTransform: 'capitalize' },
    exerciseMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    doneTag: { backgroundColor: colors.successSoft, borderRadius: radii.full, paddingHorizontal: 11, paddingVertical: 5 },
    doneTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.successInk },
    tableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tableHeaderText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.muted },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
    setNumber: { width: 34, fontFamily: fonts.head, fontSize: 15, color: colors.muted },
    readValue: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
    check: { width: 44, alignItems: 'center' },
  });
}
