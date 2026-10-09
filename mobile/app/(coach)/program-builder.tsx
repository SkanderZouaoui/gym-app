import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/Button';
import { Banner, EmptyState } from '../../src/components/ui';
import { ProgramExerciseSummary } from '../../src/components/training/ProgramExerciseSummary';
import type { SetDraft } from '../../src/components/training/SetRow';
import { useAssignProgram, type AssignProgramDayInput, type AssignProgramExerciseInput } from '../../src/hooks/useCoachSessions';
import { ApiError } from '../../src/api/client';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type DraftExercise = { exerciseId: string; name: string; sets: SetDraft[] };
type DraftDay = { dayOfWeek: number; label: string; exercises: DraftExercise[] };

function summarizeReps(sets: SetDraft[]): string {
  const reps = sets.map((s) => s.reps).filter(Boolean);
  if (reps.length === 0) return '—';
  const unique = new Set(reps);
  return unique.size === 1 ? reps[0] : `${reps[0]}-${reps[reps.length - 1]}`;
}

/** Composeur de programme côté coach — assigne un programme à un élève précis,
 * avec des séries personnalisables individuellement (reps + poids).
 * FitZone App Coach.dc.html, L3. */
export default function CoachProgramBuilderScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    studentId: string;
    studentName: string;
    pickedExerciseId?: string;
    pickedExerciseName?: string;
    pickedExerciseSets?: string;
    dayIndex?: string;
    editingIndex?: string;
  }>();

  const [name, setName] = useState('Programme');
  const [days, setDays] = useState<DraftDay[]>([{ dayOfWeek: 0, label: 'Jour 1', exercises: [] }]);
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const assignProgram = useAssignProgram();

  useEffect(() => {
    if (!params.pickedExerciseId || !params.pickedExerciseName || !params.pickedExerciseSets) return;
    const targetDay = params.dayIndex ? Number(params.dayIndex) : activeDay;
    const sets: SetDraft[] = JSON.parse(params.pickedExerciseSets);
    const newExercise: DraftExercise = { exerciseId: params.pickedExerciseId!, name: params.pickedExerciseName!, sets };
    const editIndex = params.editingIndex !== undefined ? Number(params.editingIndex) : null;

    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== targetDay) return day;
        if (editIndex !== null) {
          return { ...day, exercises: day.exercises.map((ex, j) => (j === editIndex ? newExercise : ex)) };
        }
        return { ...day, exercises: [...day.exercises, newExercise] };
      }),
    );
    setActiveDay(targetDay);
    router.setParams({
      pickedExerciseId: undefined,
      pickedExerciseName: undefined,
      pickedExerciseSets: undefined,
      dayIndex: undefined,
      editingIndex: undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.pickedExerciseId]);

  const addDay = () => {
    setDays((prev) => [...prev, { dayOfWeek: prev.length % 7, label: `Jour ${prev.length + 1}`, exercises: [] }]);
    setActiveDay(days.length);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setDays((prev) =>
      prev.map((day, i) => (i === dayIndex ? { ...day, exercises: day.exercises.filter((_, j) => j !== exerciseIndex) } : day)),
    );
  };

  const handleSave = () => {
    setError(null);
    if (days.every((d) => d.exercises.length === 0)) {
      setError('Ajoutez au moins un exercice avant d’assigner.');
      return;
    }
    const payload = {
      name,
      assignedToId: params.studentId,
      days: days
        .filter((d) => d.exercises.length > 0)
        .map<AssignProgramDayInput>((d) => ({
          dayOfWeek: d.dayOfWeek,
          label: d.label,
          exercises: d.exercises.map<AssignProgramExerciseInput>((ex) => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets.length,
            reps: summarizeReps(ex.sets),
            setDetails: ex.sets.map((s) => ({
              setNumber: s.setNumber,
              reps: s.reps ? Number(s.reps) : undefined,
              weightKg: s.weightKg ? Number(s.weightKg) : undefined,
            })),
          })),
        })),
    };
    assignProgram.mutate(payload, {
      onSuccess: () => router.replace(`/(coach)/student/${params.studentId}`),
      onError: (e) => setError(e instanceof ApiError ? e.message : "Erreur lors de l'assignation"),
    });
  };

  const current = days[activeDay];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={`Programme pour ${params.studentName ?? ''}`} fallbackHref={`/(coach)/student/${params.studentId}`} />
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <TextInput value={name} onChangeText={setName} style={styles.nameInput} placeholder="Nom du programme" placeholderTextColor={colors.muted} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
          {days.map((day, i) => (
            <Pressable key={i} onPress={() => setActiveDay(i)} style={[styles.dayTab, i === activeDay && styles.dayTabActive]}>
              <Text style={[styles.dayTabText, i === activeDay && styles.dayTabTextActive]}>
                {day.label || DAY_LABELS[day.dayOfWeek]}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={addDay} style={styles.addDayButton}>
            <MaterialIcons name="add" size={18} color={colors.primaryInk} />
          </Pressable>
        </ScrollView>

        <View style={{ gap: spacing.sm }}>
          {current.exercises.length === 0 ? (
            <EmptyState icon="playlist-add" title="Aucun exercice" text="Ajoutez des exercices depuis la bibliothèque." tone="primary" />
          ) : (
            current.exercises.map((ex, i) => (
              <ProgramExerciseSummary
                key={`${ex.exerciseId}-${i}`}
                name={ex.name}
                sets={ex.sets.map((s) => ({ setNumber: s.setNumber, reps: s.reps ? Number(s.reps) : undefined, weightKg: s.weightKg ? Number(s.weightKg) : undefined }))}
                onRemove={() => removeExercise(activeDay, i)}
                onEdit={() =>
                  router.push({
                    pathname: '/(coach)/exercises/configure',
                    params: {
                      exerciseId: ex.exerciseId,
                      dayIndex: String(activeDay),
                      studentId: params.studentId,
                      studentName: params.studentName,
                      initialSets: JSON.stringify(ex.sets),
                      editingIndex: String(i),
                    },
                  })
                }
              />
            ))
          )}

          <Pressable
            style={styles.addExerciseButton}
            onPress={() => router.push({ pathname: '/(coach)/exercises', params: { pickFor: String(activeDay), studentId: params.studentId, studentName: params.studentName } })}
          >
            <MaterialIcons name="library-add" size={18} color={colors.primaryInk} />
            <Text style={styles.addExerciseText}>Ajouter depuis la bibliothèque</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={assignProgram.isPending ? 'Envoi…' : `Assigner à ${params.studentName ?? ''}`} onPress={handleSave} loading={assignProgram.isPending} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    nameInput: {
      height: 48, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.borderStrong,
      paddingHorizontal: 14, fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text, backgroundColor: colors.surface,
    },
    dayTabs: { gap: 8 },
    dayTab: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    dayTabActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
    dayTabText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    dayTabTextActive: { color: colors.onSecondary },
    addDayButton: {
      width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.primaryBorder,
      backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
    },
    addExerciseButton: {
      height: 48, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.primaryBorder, borderStyle: 'dashed',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primarySoft,
    },
    addExerciseText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.primaryInk },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
  });
}
