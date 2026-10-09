import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/Button';
import { Banner, BottomSheet, EmptyState } from '../../src/components/ui';
import { ProgramExerciseSummary } from '../../src/components/training/ProgramExerciseSummary';
import type { SetDraft } from '../../src/components/training/SetRow';
import {
  useCreateOwnProgram,
  useUpdateOwnProgram,
  type ProgramDayInput,
  type ProgramExerciseInput,
} from '../../src/hooks/useCoaching';
import { useProgramDetail } from '../../src/hooks/useCoachSessions';
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

/** Composeur de programme personnel — création ET modification (si `programId`
 * est passé en paramètre). L'adhérent choisit ses jours, ajoute des exercices
 * depuis la bibliothèque et règle chaque série individuellement. */
export default function ProgramBuilderScreen() {
  const params = useLocalSearchParams<{
    programId?: string;
    pickedExerciseId?: string;
    pickedExerciseName?: string;
    pickedExerciseSets?: string;
    dayIndex?: string;
    editingIndex?: string;
  }>();
  const isEditing = !!params.programId;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: existingProgram, isLoading: isLoadingExisting } = useProgramDetail(params.programId);

  const [name, setName] = useState('Mon programme');
  const [days, setDays] = useState<DraftDay[]>([{ dayOfWeek: 0, label: 'Jour 1', exercises: [] }]);
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [renamingDay, setRenamingDay] = useState(false);
  const [dayNameDraft, setDayNameDraft] = useState('');
  const createProgram = useCreateOwnProgram();
  const updateProgram = useUpdateOwnProgram();
  const saving = createProgram.isPending || updateProgram.isPending;

  useEffect(() => {
    if (!isEditing || !existingProgram || hydrated) return;
    setName(existingProgram.name);
    setDays(
      existingProgram.days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        label: d.label ?? DAY_LABELS[d.dayOfWeek],
        exercises: d.exercises.map((ex) => ({
          exerciseId: ex.exercise.id,
          name: ex.exercise.name,
          sets: ex.setDetails.length > 0
            ? ex.setDetails.map((s) => ({ setNumber: s.setNumber, reps: s.reps ? String(s.reps) : '', weightKg: s.weightKg ? String(s.weightKg) : '' }))
            : Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, reps: ex.reps, weightKg: '' })),
        })),
      })),
    );
    setHydrated(true);
  }, [isEditing, existingProgram, hydrated]);

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

  const openRenameDay = (dayIndex: number) => {
    setDayNameDraft(days[dayIndex].label || DAY_LABELS[days[dayIndex].dayOfWeek]);
    setRenamingDay(true);
  };

  const confirmRenameDay = () => {
    const trimmed = dayNameDraft.trim();
    setDays((prev) => prev.map((day, i) => (i === activeDay ? { ...day, label: trimmed || DAY_LABELS[day.dayOfWeek] } : day)));
    setRenamingDay(false);
  };

  const handleSave = () => {
    setError(null);
    if (days.every((d) => d.exercises.length === 0)) {
      setError('Ajoutez au moins un exercice avant d’enregistrer.');
      return;
    }
    const payload: { name: string; days: ProgramDayInput[] } = {
      name,
      days: days
        .filter((d) => d.exercises.length > 0)
        .map((d) => ({
          dayOfWeek: d.dayOfWeek,
          label: d.label,
          exercises: d.exercises.map<ProgramExerciseInput>((ex) => ({
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

    if (isEditing) {
      updateProgram.mutate(
        { id: params.programId!, payload },
        {
          onSuccess: () => router.replace(`/(member)/program/${params.programId}`),
          onError: (e) => setError(e instanceof ApiError ? e.message : 'Erreur lors de la modification du programme'),
        },
      );
    } else {
      createProgram.mutate(payload, {
        onSuccess: () => router.replace('/(member)/(tabs)/training'),
        onError: (e) => setError(e instanceof ApiError ? e.message : 'Erreur lors de la création du programme'),
      });
    }
  };

  if (isEditing && isLoadingExisting) return null;

  const current = days[activeDay];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={isEditing ? 'Modifier le programme' : 'Nouveau programme'} fallbackHref="/(member)/(tabs)/training" />
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <TextInput value={name} onChangeText={setName} style={styles.nameInput} placeholder="Nom du programme" placeholderTextColor={colors.muted} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
          {days.map((day, i) => (
            <Pressable
              key={i}
              onPress={() => (i === activeDay ? openRenameDay(i) : setActiveDay(i))}
              style={[styles.dayTab, i === activeDay && styles.dayTabActive]}
            >
              <Text style={[styles.dayTabText, i === activeDay && styles.dayTabTextActive]}>
                {day.label || DAY_LABELS[day.dayOfWeek]}
              </Text>
              {i === activeDay ? (
                <MaterialIcons name="edit" size={13} color={colors.primaryInk} style={{ marginLeft: 6 }} />
              ) : null}
            </Pressable>
          ))}
          <Pressable onPress={addDay} style={styles.addDayButton} hitSlop={8}>
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
                    pathname: '/(member)/exercises/configure',
                    params: {
                      exerciseId: ex.exerciseId,
                      dayIndex: String(activeDay),
                      initialSets: JSON.stringify(ex.sets),
                      editingIndex: String(i),
                      programId: params.programId,
                    },
                  })
                }
              />
            ))
          )}

          <Pressable
            style={styles.addExerciseButton}
            onPress={() => router.push({ pathname: '/(member)/exercises', params: { pickFor: String(activeDay), programId: params.programId } })}
          >
            <MaterialIcons name="library-add" size={18} color={colors.primaryInk} />
            <Text style={styles.addExerciseText}>Ajouter depuis la bibliothèque</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={saving ? 'Enregistrement…' : isEditing ? 'Enregistrer les modifications' : 'Enregistrer le programme'}
          onPress={handleSave}
          loading={saving}
        />
      </View>

      <BottomSheet visible={renamingDay} onClose={() => setRenamingDay(false)}>
        <Text style={styles.sheetTitle}>Nom du jour</Text>
        <TextInput
          value={dayNameDraft}
          onChangeText={setDayNameDraft}
          style={styles.nameInput}
          placeholder="Ex. Poussée, Tirage, Jambes…"
          placeholderTextColor={colors.muted}
          autoFocus
          onSubmitEditing={confirmRenameDay}
          returnKeyType="done"
        />
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Enregistrer" onPress={confirmRenameDay} />
          <Button label="Annuler" onPress={() => setRenamingDay(false)} variant="outline" />
        </View>
      </BottomSheet>
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
  dayTabs: { gap: 6 },
  dayTab: { flexDirection: 'row', height: 44, paddingHorizontal: 18, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  dayTabActive: { backgroundColor: colors.primarySoft },
  dayTabText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  dayTabTextActive: { color: colors.primaryInk },
  addDayButton: {
    width: 44, height: 44, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  addExerciseButton: {
    height: 48, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.primaryBorder, borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primarySoft,
  },
  addExerciseText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.primaryInk },
  sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
  },
  });
}
