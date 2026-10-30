import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useExercise, useMyWorkouts } from '../../../src/hooks/useCoaching';
import { EmptyState, ScreenTitle, Toast } from '../../../src/components/ui';
import { ExerciseGif } from '../../../src/components/training/ExerciseGif';
import { muscleGroupLabel } from '../../../src/constants/muscleGroups';
import { parseExerciseInstructions } from '../../../src/components/training/exerciseText';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useTranslation } from 'react-i18next';

/** Fiche exercice — FitZone App Entraînement.dc.html, E3. */
export default function ExerciseDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: exercise, isLoading, isError, refetch } = useExercise(id);
  const { data: workouts, refetch: refetchWorkouts } = useMyWorkouts();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(() =>
    Promise.all([refetch(), refetchWorkouts()]),
  );

  const parsed = useMemo(() => parseExerciseInstructions(exercise?.instructions ?? null), [exercise]);

  const record = useMemo(() => {
    if (!workouts || !id) return null;
    const points: { date: Date; weight: number; reps: number }[] = [];
    for (const log of workouts) {
      for (const s of log.sets) {
        if (s.exerciseId === id && s.weightKg) {
          points.push({ date: new Date(log.date), weight: Number(s.weightKg), reps: s.reps ?? 0 });
        }
      }
    }
    if (points.length === 0) return null;
    points.sort((a, b) => a.date.getTime() - b.date.getTime());
    const best = points.reduce((max, p) => (p.weight > max.weight ? p : max), points[0]);
    const last = points[points.length - 1];
    return { bestWeight: best.weight, bestReps: best.reps, lastWeight: last.weight, lastReps: last.reps };
  }, [workouts, id]);

  if (isLoading && !exercise) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="" fallbackHref="/(member)/(tabs)/training" />
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            icon="cloud-off"
            title={t('member.exercice_indisponible')}
            text={isError ? t('member.impossible_de_recuperer_cet_exercice') : t('member.cet_exercice_est_introuvable')}
            tone="danger"
            actionLabel={isError ? t('common.reessayer') : undefined}
            onAction={isError ? () => refetch() : undefined}
          />
        </View>
      </SafeAreaView>
    );
  }

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/training'));
  const groupLabel = exercise.muscleGroup ? muscleGroupLabel(exercise.muscleGroup) : null;
  const equipment = parsed.equipment ?? exercise.equipment;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.exercices')}</Text>
        </Pressable>

        <View style={styles.hero}>
          <ExerciseGif uri={exercise.mediaKey} size={240} plain />
          {equipment ? (
            <View style={styles.equipmentChip}>
              <Text style={styles.equipmentChipText}>{equipment}</Text>
            </View>
          ) : null}
        </View>

        <ScreenTitle
          title={exercise.name}
          subtitle={t('member.exercice_de_la_bibliotheque', { v0: groupLabel ?? t('member.exercise_fallback') })}
        />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statLabel}>{t('member.mon_record')}</Text>
            <Text style={styles.statValue}>{record ? `${record.bestWeight} kg` : '—'}</Text>
          </View>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statLabel}>{t('member.derniere_seance')}</Text>
            <Text style={styles.statValue}>{record ? `${record.lastWeight} kg` : '—'}</Text>
          </View>
        </View>

        {groupLabel || parsed.secondaryMuscles.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{t('common.muscles_sollicites')}</Text>
            <View style={styles.chipsRow}>
              {groupLabel ? (
                <LinearGradient colors={[colors.primary, colors.primaryPressed]} style={styles.musclePrimary}>
                  <Text style={styles.musclePrimaryText}>{groupLabel}</Text>
                </LinearGradient>
              ) : null}
              {parsed.secondaryMuscles.map((m) => (
                <View key={m} style={styles.muscleSecondary}>
                  <Text style={styles.muscleSecondaryText}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {parsed.steps.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{t('common.execution')}</Text>
            <View style={[styles.stepsCard, cardShadow]}>
              {parsed.steps.map((step, i) => (
                <View key={i} style={[styles.stepRow, i === parsed.steps.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.tip}>
          <MaterialIcons name="lightbulb-outline" size={22} color={colors.primaryInk} />
          <Text style={styles.tipText}>
            <Text style={{ fontFamily: fonts.bodyBold }}>{t('member.conseil')}</Text>
            {' '}{t('member.tip_text')}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push({ pathname: '/(member)/exercises/configure', params: { exerciseId: exercise.id, dayIndex: '0' } })}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="playlist-add" size={24} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{t('member.ajouter_a_un_programme')}</Text>
          </LinearGradient>
        </Pressable>
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
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    hero: { alignItems: 'center', gap: 10 },
    equipmentChip: { backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    equipmentChipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk, textTransform: 'capitalize' },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    statValue: { fontFamily: fonts.head, fontSize: 24, letterSpacing: -0.8, color: colors.text, marginTop: 2 },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10, marginTop: 6 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    musclePrimary: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    musclePrimaryText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
    muscleSecondary: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft },
    muscleSecondaryText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    stepsCard: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      paddingVertical: 6, paddingHorizontal: 16,
    },
    stepRow: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    stepBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    stepBadgeText: { fontFamily: fonts.head, fontSize: 14, color: colors.primaryInk },
    stepText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
    tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.primarySoft, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
    tipText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.primaryInk },
    ctaShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 6,
    },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
