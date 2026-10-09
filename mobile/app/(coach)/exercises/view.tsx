import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useExercise } from '../../../src/hooks/useCoaching';
import { useStudentWorkouts } from '../../../src/hooks/useCoachSessions';
import { Banner, Pill } from '../../../src/components/ui';
import { ExerciseGif } from '../../../src/components/training/ExerciseGif';
import { ExerciseRecordCard } from '../../../src/components/training/ExerciseRecordCard';
import { parseExerciseInstructions } from '../../../src/components/training/exerciseText';

/** Détail en lecture seule d'un exercice déjà enregistré dans un programme —
 * vue coach, avec le record personnel de l'élève. FitZone App Coach.dc.html. */
export default function CoachViewProgramExerciseScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { exerciseId, sets, reps, setDetails, studentId } = useLocalSearchParams<{
    exerciseId: string;
    sets: string;
    reps: string;
    setDetails?: string;
    studentId?: string;
  }>();
  const { data: exercise, isLoading } = useExercise(exerciseId);
  const { data: studentWorkouts } = useStudentWorkouts(studentId);

  const parsedSetDetails: { setNumber: number; reps: number | null; weightKg: string | null }[] = setDetails
    ? JSON.parse(setDetails)
    : [];

  const parsed = useMemo(() => parseExerciseInstructions(exercise?.instructions ?? null), [exercise]);

  const record = useMemo(() => {
    if (!studentWorkouts || !exerciseId) return null;
    const points: { date: Date; weight: number; reps: number }[] = [];
    for (const log of studentWorkouts) {
      for (const s of log.sets) {
        if (s.exerciseId === exerciseId && s.weightKg) {
          points.push({ date: new Date(log.date), weight: Number(s.weightKg), reps: s.reps ?? 0 });
        }
      }
    }
    if (points.length === 0) return null;
    points.sort((a, b) => a.date.getTime() - b.date.getTime());
    const best = points.reduce((max, p) => (p.weight > max.weight ? p : max), points[0]);
    const first = points[0];
    const weeksSpan = Math.max(1, Math.round((best.date.getTime() - first.date.getTime()) / (7 * 86_400_000)));
    const deltaKg = points.length >= 2 ? Math.round((best.weight - first.weight) * 10) / 10 : null;
    return { bestWeight: best.weight, bestReps: best.reps, deltaKg, weeksSpan: points.length >= 2 ? weeksSpan : null, series: points.map((p) => p.weight) };
  }, [studentWorkouts, exerciseId]);

  if (isLoading || !exercise) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="" fallbackHref={studentId ? `/(coach)/student/${studentId}` : '/(coach)/(tabs)/students'} />
      <ScrollView contentContainerStyle={styles.container}>
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

        {record ? (
          <ExerciseRecordCard
            bestWeight={record.bestWeight}
            bestReps={record.bestReps}
            deltaKg={record.deltaKg}
            weeksSpan={record.weeksSpan}
            series={record.series}
          />
        ) : null}

        <View>
          <Text style={styles.sectionTitle}>Séries du programme</Text>
          {parsedSetDetails.length > 0 ? (
            <View style={styles.setsList}>
              {parsedSetDetails.map((s) => (
                <View key={s.setNumber} style={styles.setRow}>
                  <View style={styles.setBadge}>
                    <Text style={styles.setBadgeText}>{s.setNumber}</Text>
                  </View>
                  <Text style={styles.setText}>
                    {s.reps ?? '—'} répétitions{s.weightKg ? ` · ${s.weightKg} kg` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.summaryText}>{sets} séries · {reps}</Text>
          )}
        </View>

        {parsed.steps.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Consignes</Text>
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
          text="Utilisez des pinces et un pareur au-delà de 80 % de votre maximum."
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
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
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
