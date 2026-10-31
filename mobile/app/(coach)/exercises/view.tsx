import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useExercise } from '../../../src/hooks/useCoaching';
import { Banner, Pill, DetailSkeleton } from '../../../src/components/ui';
import { ExerciseGif } from '../../../src/components/training/ExerciseGif';
import { parseExerciseInstructions } from '../../../src/components/training/exerciseText';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';

/** Détail en lecture seule d'un exercice déjà enregistré dans un programme —
 * vue coach (sans donnée d'adhérent). FitZone App Coach.dc.html. */
export default function CoachViewProgramExerciseScreen() {
  const pullClient = useQueryClient();
  const { refreshing: pullRefreshing, onRefresh: pullOnRefresh } = useOfflineAwareRefresh(() => pullClient.invalidateQueries());
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { exerciseId, sets, reps, setDetails } = useLocalSearchParams<{
    exerciseId: string;
    sets: string;
    reps: string;
    setDetails?: string;
  }>();
  const { data: exercise, isLoading } = useExercise(exerciseId);

  const parsedSetDetails: { setNumber: number; reps: number | null; weightKg: string | null }[] = setDetails
    ? JSON.parse(setDetails)
    : [];

  const parsed = useMemo(() => parseExerciseInstructions(exercise?.instructions ?? null), [exercise]);

  if (isLoading || !exercise) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="" fallbackHref="/(coach)/(tabs)/programs" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={pullOnRefresh} />} contentContainerStyle={styles.container}>
        <View style={styles.mediaWrap}>
          <ExerciseGif uri={exercise.mediaKey} size={200} />
        </View>
        <Text style={styles.name}>{exercise.name}</Text>
        {parsed.equipment ? <Text style={styles.equipmentLine}>{parsed.equipment}</Text> : null}

        <View style={styles.chipsRow}>
          {exercise.muscleGroup ? <Pill label={exercise.muscleGroup} tone="primary" /> : null}
          {parsed.secondaryMuscles.map((m) => (
            <Pill key={m} label={m} tone="secondary" />
          ))}
        </View>

        <View>
          <Text style={styles.sectionTitle}>{t('coach.series_du_programme')}</Text>
          {parsedSetDetails.length > 0 ? (
            <View style={styles.setsList}>
              {parsedSetDetails.map((s) => (
                <View key={s.setNumber} style={styles.setRow}>
                  <View style={styles.setBadge}>
                    <Text style={styles.setBadgeText}>{s.setNumber}</Text>
                  </View>
                  <Text style={styles.setText}>{t('coach.repetitions', { v1: s.reps ?? '—', v3: s.weightKg ? t('member.kg', { weightKg: s.weightKg }) : '' })}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.summaryText}>{t('coach.series', { sets, reps })}</Text>
          )}
        </View>

        {parsed.steps.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{t('common.consignes')}</Text>
            <View style={styles.stepsList}>
              {parsed.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Banner
          tone="warning"
          icon="warning"
          text={t('common.utilisez_des_pinces_et_un')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    mediaWrap: { alignItems: 'center', marginBottom: spacing.sm },
    name: { fontFamily: fonts.head, fontSize: 22, color: colors.text, textTransform: 'capitalize' },
    equipmentLine: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textTransform: 'capitalize', marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text, marginBottom: spacing.sm },
    summaryText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    setsList: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
    setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    setBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.secondarySoft, alignItems: 'center', justifyContent: 'center' },
    setBadgeText: { fontFamily: fonts.headBold, fontSize: 11.5, color: colors.secondaryInk },
    setText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.text },
    stepsList: { gap: spacing.sm },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    stepBadge: {
      width: 24, height: 24, borderRadius: 12, backgroundColor: colors.secondary,
      alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    stepBadgeText: { fontFamily: fonts.headBold, fontSize: 11.5, color: colors.onSecondary },
    stepText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 20 },
  });
}
