import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCreateWorkoutLog, useExercises, useMyWorkouts } from '../../../src/hooks/useCoaching';
import { Banner, ScreenTitle } from '../../../src/components/ui';
import { WorkoutHeroCard } from '../../../src/components/training/WorkoutHeroCard';
import { clearSessionDraft } from '../../../src/hooks/useSessionDraft';
import { formatClock } from '../../../src/utils/duration';

interface FinishedSet {
  exerciseId: string;
  setNumber: number;
  weightKg?: number;
  reps?: number;
}

/** Or des records : volontairement distinct de la couleur d'accent. */
const GOLD = '#FBBF24';
const GOLD_DEEP = '#F59E0B';
const GOLD_INK = '#3A2500';

const FEELINGS = [
  { value: 'EASY', label: 'Facile' },
  { value: 'OK', label: 'Correct' },
  { value: 'HARD', label: 'Difficile' },
];

/** Fin de séance : même rendu que le détail d'une séance de l'historique (carte héro, une carte par
 * exercice avec ses séries), avec en plus le ressenti à choisir et l'enregistrement. Une fois la
 * séance enregistrée, retour à l'onglet Entraînement. */
export default function SessionSummaryScreen() {
  const { workoutSets, elapsedSeconds, programId, dayId } = useLocalSearchParams<{
    workoutSets: string;
    elapsedSeconds: string;
    avgRestSeconds?: string;
    programId?: string;
    dayId?: string;
  }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sets: FinishedSet[] = useMemo(() => JSON.parse(workoutSets ?? '[]'), [workoutSets]);
  const { data: history } = useMyWorkouts();
  const { data: exercises } = useExercises();
  const createWorkout = useCreateWorkoutLog();
  const [feeling, setFeeling] = useState<string>('OK');
  const [error, setError] = useState<string | null>(null);

  const totalSeconds = Number(elapsedSeconds ?? 0);
  const minutes = Math.round(totalSeconds / 60);
  const volume = sets.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0);

  const exerciseGroups = useMemo(() => {
    const groups = new Map<string, FinishedSet[]>();
    for (const s of sets) {
      if (!groups.has(s.exerciseId)) groups.set(s.exerciseId, []);
      groups.get(s.exerciseId)!.push(s);
    }
    return Array.from(groups.entries());
  }, [sets]);

  const nameOf = (exerciseId: string) => exercises?.find((e) => e.id === exerciseId)?.name ?? 'Exercice';

  // Records battus pendant la séance : meilleure charge par exercice, si supérieure à l'historique.
  const records = useMemo(() => {
    if (!history) return [];
    const bestByExercise = new Map<string, number>();
    for (const log of history) {
      for (const s of log.sets) {
        const w = Number(s.weightKg) || 0;
        if (w > (bestByExercise.get(s.exerciseId) ?? 0)) bestByExercise.set(s.exerciseId, w);
      }
    }
    const best = new Map<string, FinishedSet>();
    for (const s of sets) {
      const w = s.weightKg ?? 0;
      if (w > (bestByExercise.get(s.exerciseId) ?? 0) && w > (best.get(s.exerciseId)?.weightKg ?? 0)) best.set(s.exerciseId, s);
    }
    return Array.from(best.values());
  }, [history, sets]);
  const recordExerciseIds = useMemo(() => new Set(records.map((r) => r.exerciseId)), [records]);

  const handleSave = () => {
    setError(null);
    createWorkout.mutate(
      {
        programId,
        dayId,
        feeling,
        durationMinutes: minutes,
        durationSeconds: totalSeconds,
        sets: sets.map((s) => ({ exerciseId: s.exerciseId, setNumber: s.setNumber, weightKg: s.weightKg, reps: s.reps })),
      },
      {
        onSuccess: () => {
          if (programId && dayId) clearSessionDraft(programId, dayId);
          // On repart de l'onglet Entraînement avec une pile propre : le bouton retour ne ramène pas
          // sur la séance ou le programme (dont les jours ont pu changer).
          if (router.canDismiss()) router.dismissAll();
          router.replace('/(member)/(tabs)/training');
        },
        onError: () => setError('Erreur lors de l’enregistrement de la séance.'),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <MaterialIcons name="flag" size={14} color={colors.successInk} />
            <Text style={styles.pillText}>Séance terminée</Text>
          </View>
        </View>

        <ScreenTitle
          title="Récapitulatif"
          subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        />

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <WorkoutHeroCard
          duration={formatClock(totalSeconds)}
          progress={1}
          ringLabel="100%"
          volume={volume > 0 ? `${Math.round(volume).toLocaleString('fr-FR')} kg` : '—'}
          sets={String(sets.length)}
        />

        {records.length > 0 ? (
          <View style={styles.recordBadges}>
            {records.map((r) => (
              <View key={r.exerciseId} style={styles.recordBadgeShadow}>
                <LinearGradient colors={[GOLD, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.recordBadge}>
                  <View style={styles.recordIcon}>
                    <MaterialIcons name="emoji-events" size={18} color={GOLD_INK} />
                  </View>
                  <View style={styles.recordTexts}>
                    <Text style={styles.recordKicker}>RECORD · {r.weightKg} kg</Text>
                    <Text style={styles.recordName}>{nameOf(r.exerciseId)}</Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>
        ) : null}

        <View>
          <Text style={styles.sectionTitle}>Ressenti</Text>
          <View style={styles.feelingRow}>
            {FEELINGS.map((f) => {
              const active = feeling === f.value;
              return (
                <Pressable key={f.value} style={styles.feelingChip} onPress={() => setFeeling(f.value)}>
                  {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  ) : null}
                  <Text style={[styles.feelingText, active && styles.feelingTextActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {exerciseGroups.map(([exId, exSets]) => (
          <View key={exId} style={[styles.exerciseCard, cardShadow]}>
            <View style={styles.exerciseHeaderRow}>
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exerciseThumb}>
                <MaterialIcons name="fitness-center" size={24} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.exerciseName} numberOfLines={1}>{nameOf(exId)}</Text>
                <Text style={styles.exerciseMeta}>{exSets.length} série{exSets.length > 1 ? 's' : ''}</Text>
              </View>
              {recordExerciseIds.has(exId) ? (
                <View style={styles.recordTag}>
                  <Text style={styles.recordTagText}>RECORD</Text>
                </View>
              ) : (
                <View style={styles.doneTag}>
                  <Text style={styles.doneTagText}>{exSets.length}/{exSets.length}</Text>
                </View>
              )}
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 34 }]}>SÉRIE</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>KG</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>REPS</Text>
              <View style={{ width: 44 }} />
            </View>
            {exSets.map((st) => (
              <View key={st.setNumber} style={styles.row}>
                <Text style={styles.setNumber}>{st.setNumber}</Text>
                <Text style={styles.readValue}>{st.weightKg ? String(st.weightKg) : '—'}</Text>
                <Text style={styles.readValue}>{st.reps ?? '—'}</Text>
                <View style={styles.check}>
                  <MaterialIcons name="check-circle" size={26} color={colors.successInk} />
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={createWorkout.isPending}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, createWorkout.isPending && { opacity: 0.7 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="check" size={24} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{createWorkout.isPending ? 'Enregistrement…' : 'Enregistrer la séance'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: spacing.xs, minHeight: 44 },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: radii.full, backgroundColor: colors.successSoft,
    },
    pillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.successInk },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10 },
    recordBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    recordBadgeShadow: {
      width: '48.5%', borderRadius: 18, shadowColor: GOLD_DEEP, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    recordBadge: { flexGrow: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingLeft: 8, paddingRight: 10, borderRadius: 18 },
    recordIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center' },
    recordTexts: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
    recordKicker: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.4, color: 'rgba(58,37,0,0.75)' },
    recordName: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18, color: GOLD_INK, textTransform: 'capitalize' },
    feelingRow: { flexDirection: 'row', gap: 8 },
    feelingChip: {
      flex: 1, height: 44, borderRadius: radii.full, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    feelingText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    feelingTextActive: { color: colors.primaryContrast, fontFamily: fonts.bodyBold },
    exerciseCard: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
    },
    exerciseHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    exerciseThumb: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    exerciseName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, textTransform: 'capitalize' },
    exerciseMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    doneTag: { backgroundColor: colors.successSoft, borderRadius: radii.full, paddingHorizontal: 11, paddingVertical: 5 },
    doneTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.successInk },
    recordTag: { backgroundColor: GOLD, borderRadius: radii.full, paddingHorizontal: 11, paddingVertical: 5 },
    recordTagText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, color: GOLD_INK },
    tableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tableHeaderText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.muted },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
    setNumber: { width: 34, fontFamily: fonts.head, fontSize: 15, color: colors.muted },
    readValue: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
    check: { width: 44, alignItems: 'center' },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
    ctaShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
