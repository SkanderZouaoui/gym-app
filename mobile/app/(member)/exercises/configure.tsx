import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useExercise } from '../../../src/hooks/useCoaching';
import { ScreenTitle } from '../../../src/components/ui';
import { muscleGroupLabel } from '../../../src/constants/muscleGroups';
import { ExerciseGif } from '../../../src/components/training/ExerciseGif';
import type { SetDraft } from '../../../src/components/training/SetRow';
import { ExerciseEditorCard } from '../../../src/components/training/ExerciseEditorCard';
import { useExercisePickStore } from '../../../src/store/exercisePick';
import { useTranslation } from 'react-i18next';

/** Détail d'un exercice avant ajout au programme : chaque série se règle
 * individuellement (reps + poids), au lieu d'un réglage unique répété. */
export default function ConfigureExerciseScreen() {
  const { t } = useTranslation();
  const { exerciseId, dayIndex, initialSets, editingIndex, programId, returnTo, dayId } = useLocalSearchParams<{
    exerciseId: string;
    dayIndex: string;
    initialSets?: string;
    editingIndex?: string;
    programId?: string;
    returnTo?: string;
    dayId?: string;
  }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

  const setPick = useExercisePickStore((st) => st.setPick);

  const handleConfirm = () => {
    if (!exercise) return;
    // Retour à l'écran d'origine (séance en cours / composeur) qui est resté monté sous la pile :
    // on lui passe le choix via le store puis on ferme configure + bibliothèque.
    if ((returnTo === 'session-live' || returnTo === 'builder') && router.canDismiss()) {
      setPick({
        target: returnTo === 'session-live' ? 'session' : 'builder',
        exerciseId: exercise.id,
        name: exercise.name,
        sets,
        dayIndex: dayIndex !== undefined ? Number(dayIndex) : undefined,
        editingIndex: editingIndex !== undefined ? Number(editingIndex) : undefined,
      });
      router.dismiss(2);
      return;
    }
    if (returnTo === 'session-live') {
      router.replace({
        pathname: '/(member)/session/live/[programId]/[dayId]',
        params: {
          programId: programId!,
          dayId: dayId!,
          pickedExerciseId: exercise.id,
          pickedExerciseName: exercise.name,
          pickedExerciseSets: JSON.stringify(sets),
        },
      });
      return;
    }
    router.replace({
      pathname: '/(member)/program-builder',
      params: {
        pickedExerciseId: exercise.id,
        pickedExerciseName: exercise.name,
        pickedExerciseSets: JSON.stringify(sets),
        dayIndex,
        editingIndex,
        programId,
      },
    });
  };

  if (isLoading || !exercise) return null;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/training'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.exercices')}</Text>
        </Pressable>
        <ScreenTitle
          title={exercise.name}
          subtitle={t('member.reglez_les_series', { v0: exercise.muscleGroup ? muscleGroupLabel(exercise.muscleGroup) : t('member.exercice') })}
        />

        <View style={styles.media}>
          <ExerciseGif uri={exercise.mediaKey} size={200} plain />
        </View>

        <ExerciseEditorCard
          name={exercise.name}
          sets={sets}
          onChangeSet={(index, field, value) => updateSet(index, { [field]: value })}
          onAddSet={addSet}
          onRemoveSet={removeSet}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleConfirm}
          disabled={sets.length === 0}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, sets.length === 0 && { opacity: 0.5 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="check" size={24} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{editingIndex !== undefined ? t('member.enregistrer_les_series') : t('common.ajouter_au_programme')}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    media: { alignItems: 'center' },
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
