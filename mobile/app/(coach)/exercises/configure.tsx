import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useExercise } from '../../../src/hooks/useCoaching';
import { Button } from '../../../src/components/Button';
import { ExerciseGif } from '../../../src/components/training/ExerciseGif';
import { SetRow, type SetDraft } from '../../../src/components/training/SetRow';

/** Détail d'un exercice avant assignation à un élève : chaque série se règle
 * individuellement (reps + poids), au lieu d'un réglage unique répété. */
export default function CoachConfigureExerciseScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { exerciseId, dayIndex, studentId, studentName, initialSets, editingIndex } = useLocalSearchParams<{
    exerciseId: string;
    dayIndex: string;
    studentId: string;
    studentName: string;
    initialSets?: string;
    editingIndex?: string;
  }>();
  const { data: exercise, isLoading } = useExercise(exerciseId);
  const [sets, setSets] = useState<SetDraft[]>(
    initialSets
      ? JSON.parse(initialSets)
      : [
          { setNumber: 1, reps: '10', weightKg: '' },
          { setNumber: 2, reps: '10', weightKg: '' },
          { setNumber: 3, reps: '10', weightKg: '' },
        ],
  );

  const addSet = () => setSets((prev) => [...prev, { setNumber: prev.length + 1, reps: prev.at(-1)?.reps ?? '10', weightKg: prev.at(-1)?.weightKg ?? '' }]);
  const removeSet = (index: number) =>
    setSets((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, setNumber: i + 1 })));
  const updateSet = (index: number, patch: Partial<SetDraft>) =>
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const handleConfirm = () => {
    if (!exercise) return;
    router.replace({
      pathname: '/(coach)/program-builder',
      params: {
        studentId,
        studentName,
        pickedExerciseId: exercise.id,
        pickedExerciseName: exercise.name,
        pickedExerciseSets: JSON.stringify(sets),
        dayIndex,
        editingIndex,
      },
    });
  };

  if (isLoading || !exercise) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title=""
        fallbackHref={`/(coach)/program-builder?studentId=${studentId}&studentName=${studentName}`}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.mediaWrap}>
          <ExerciseGif uri={exercise.mediaKey} size={180} />
        </View>
        <Text style={styles.name}>{exercise.name}</Text>
        {exercise.muscleGroup ? <Text style={styles.muscleGroup}>{exercise.muscleGroup}</Text> : null}

        <Text style={styles.sectionTitle}>Séries</Text>
        <View style={{ gap: spacing.sm }}>
          {sets.map((set, i) => (
            <SetRow
              key={i}
              set={set}
              onChangeReps={(reps) => updateSet(i, { reps })}
              onChangeWeight={(weightKg) => updateSet(i, { weightKg })}
              onRemove={() => removeSet(i)}
            />
          ))}
        </View>

        <Pressable style={styles.addSetButton} onPress={addSet}>
          <MaterialIcons name="add" size={18} color={colors.primaryInk} />
          <Text style={styles.addSetText}>Ajouter une série</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Ajouter au programme" onPress={handleConfirm} disabled={sets.length === 0} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 140 },
    mediaWrap: { alignItems: 'center', marginBottom: spacing.sm },
    name: { fontFamily: fonts.head, fontSize: 22, color: colors.text, textTransform: 'capitalize' },
    muscleGroup: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textTransform: 'capitalize', marginBottom: spacing.sm },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text, marginTop: spacing.sm },
    addSetButton: {
      height: 44, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.primaryBorder, borderStyle: 'dashed',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primarySoft,
    },
    addSetText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
  });
}
