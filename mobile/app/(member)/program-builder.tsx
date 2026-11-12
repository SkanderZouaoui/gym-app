import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/Button';
import { Banner, BottomSheet, EmptyState, ScreenTitle, SectionHeader } from '../../src/components/ui';
import { ExerciseEditorCard } from '../../src/components/training/ExerciseEditorCard';
import { ReorderList } from '../../src/components/training/ReorderList';
import type { SetDraft } from '../../src/components/training/SetRow';
import {
  useCreateOwnProgram,
  useUpdateOwnProgram,
  useExercises,
  type ProgramDayInput,
  type ProgramExerciseInput,
} from '../../src/hooks/useCoaching';
import { useProgramDetail } from '../../src/hooks/useCoachSessions';
import { ApiError } from '../../src/api/client';
import { useExercisePickStore } from '../../src/store/exercisePick';
import { useTranslation } from 'react-i18next';
import { WEEKDAYS_SHORT_MON } from '../../src/i18n/labels';

const DAY_LABELS = WEEKDAYS_SHORT_MON;

type DraftExercise = { uid: string; exerciseId: string; name: string; sets: SetDraft[] };
let uidCounter = 0;
const newUid = () => `ex-${++uidCounter}`;
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
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    programId?: string;
    pickedExerciseId?: string;
    pickedExerciseName?: string;
    pickedExerciseSets?: string;
    dayIndex?: string;
    editingIndex?: string;
  }>();
  const isEditing = !!params.programId;
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: existingProgram, isLoading: isLoadingExisting } = useProgramDetail(params.programId);

  const [name, setName] = useState(t('member.default_program_name'));
  const [days, setDays] = useState<DraftDay[]>([{ dayOfWeek: 0, label: t('common.jour_1'), exercises: [] }]);
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [renamingDay, setRenamingDay] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{ day: number; index: number } | null>(null);
  const { data: library } = useExercises();
  const mediaOf = useMemo(() => new Map((library ?? []).map((e) => [e.id, e.mediaKey])), [library]);
  const [dayNameDraft, setDayNameDraft] = useState('');
  const createProgram = useCreateOwnProgram();
  const updateProgram = useUpdateOwnProgram();
  const saving = createProgram.isPending || updateProgram.isPending;

  // Remplissage unique depuis le programme chargé (ajustement d'état pendant le rendu, sans effet).
  if (isEditing && existingProgram && !hydrated) {
    setName(existingProgram.name);
    setDays(
      existingProgram.days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        label: d.label ?? DAY_LABELS[d.dayOfWeek],
        exercises: d.exercises.map((ex) => ({
          uid: newUid(),
          exerciseId: ex.exercise.id,
          name: ex.exercise.name,
          sets: ex.setDetails.length > 0
            ? ex.setDetails.map((s) => ({ setNumber: s.setNumber, reps: s.reps ? String(s.reps) : '', weightKg: s.weightKg ? String(s.weightKg) : '' }))
            : Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, reps: ex.reps, weightKg: '' })),
        })),
      })),
    );
    setHydrated(true);
  }

  const pick = useExercisePickStore((st) => st.pick);
  const clearPick = useExercisePickStore((st) => st.clear);

  // Exercice choisi dans la bibliothèque (via le store) ou transmis en paramètres (nouveau programme
  // ouvert depuis la fiche d'un exercice).
  useEffect(() => {
    let incoming: { exerciseId: string; name: string; sets: SetDraft[]; dayIndex?: number; editingIndex?: number } | null = null;
    if (pick && pick.target === 'builder') {
      incoming = pick;
    } else if (params.pickedExerciseId && params.pickedExerciseName && params.pickedExerciseSets) {
      incoming = {
        exerciseId: params.pickedExerciseId,
        name: params.pickedExerciseName,
        sets: JSON.parse(params.pickedExerciseSets) as SetDraft[],
        dayIndex: params.dayIndex ? Number(params.dayIndex) : undefined,
        editingIndex: params.editingIndex !== undefined ? Number(params.editingIndex) : undefined,
      };
    }
    if (!incoming) return;
    const targetDay = incoming.dayIndex ?? activeDay;
    const newExercise: DraftExercise = { uid: newUid(), exerciseId: incoming.exerciseId, name: incoming.name, sets: incoming.sets };
    const editIndex = incoming.editingIndex ?? null;

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
    if (pick) clearPick();
    if (params.pickedExerciseId) {
      router.setParams({
        pickedExerciseId: undefined,
        pickedExerciseName: undefined,
        pickedExerciseSets: undefined,
        dayIndex: undefined,
        editingIndex: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, params.pickedExerciseId]);

  const addDay = () => {
    setDays((prev) => [...prev, { dayOfWeek: prev.length % 7, label: t('common.jour', { v0: prev.length + 1 }), exercises: [] }]);
    setActiveDay(days.length);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setDays((prev) =>
      prev.map((day, i) => (i === dayIndex ? { ...day, exercises: day.exercises.filter((_, j) => j !== exerciseIndex) } : day)),
    );
  };

  /** Replace l'exercice `from` à la position `to` dans le jour (glisser-déposer). */
  const reorderExercise = (dayIndex: number, from: number, to: number) => {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const exercises = [...day.exercises];
        const [moved] = exercises.splice(from, 1);
        exercises.splice(to, 0, moved);
        return { ...day, exercises };
      }),
    );
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, update: (sets: SetDraft[]) => SetDraft[]) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === dayIndex
          ? { ...day, exercises: day.exercises.map((ex, j) => (j === exerciseIndex ? { ...ex, sets: update(ex.sets) } : ex)) }
          : day,
      ),
    );
  };

  const renumber = (sets: SetDraft[]) => sets.map((st, i) => ({ ...st, setNumber: i + 1 }));

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
      setError(t('member.ajoutez_au_moins_un_exercice'));
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
          onError: (e) => setError(e instanceof ApiError ? e.message : t('member.erreur_lors_de_la_modification')),
        },
      );
    } else {
      createProgram.mutate(payload, {
        onSuccess: () => router.replace('/(member)/(tabs)/training'),
        onError: (e) => setError(e instanceof ApiError ? e.message : t('member.erreur_lors_de_la_creation')),
      });
    }
  };

  if (isEditing && isLoadingExisting) return null;

  const current = days[activeDay];

  const totalSets = days.reduce((sum, d) => sum + d.exercises.reduce((n, ex) => n + ex.sets.length, 0), 0);
  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);
  const estimatedMinutes = Math.round(totalSets * 3.5);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/training'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('member.entrainement')}</Text>
        </Pressable>
        <ScreenTitle
          title={isEditing ? t('member.modifier_le_programme') : t('member.design_de_programme')}
          subtitle={t('member.definissez_les_exercices_series_repetitions')}
        />

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <View style={[styles.nameCard, cardShadow]}>
          <Text style={styles.fieldLabel}>{t('member.builder_name_label')}</Text>
          <View style={styles.nameRow}>
            <TextInput value={name} onChangeText={setName} style={styles.nameInput} placeholder={t('common.nom_du_programme')} placeholderTextColor={colors.muted} selectTextOnFocus />
            <View style={styles.nameEditIcon} pointerEvents="none">
              <MaterialIcons name="edit" size={18} color={colors.primaryInk} />
            </View>
          </View>
        </View>

        <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summary}>
          <View style={styles.summaryDeco} />
          {[
            { label: t('member.builder_summary_exercises'), value: String(totalExercises), unit: '' },
            { label: t('member.builder_summary_series'), value: String(totalSets), unit: '' },
            { label: t('member.builder_summary_duration'), value: String(estimatedMinutes), unit: 'min' },
          ].map((st, i) => (
            <View key={st.label} style={[styles.summaryCol, i > 0 && styles.summaryColDivider]}>
              <Text style={styles.summaryLabel}>{st.label}</Text>
              <Text style={styles.summaryValue}>
                {st.value}
                {st.unit ? <Text style={styles.summaryUnit}> {st.unit}</Text> : null}
              </Text>
            </View>
          ))}
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
          {days.map((day, i) => (
            <Pressable
              key={i}
              onPress={() => (i === activeDay ? openRenameDay(i) : setActiveDay(i))}
              style={styles.dayTab}
            >
              {i === activeDay ? (
                <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              ) : null}
              <Text style={[styles.dayTabText, i === activeDay && styles.dayTabTextActive]}>
                {day.label || DAY_LABELS[day.dayOfWeek]}
              </Text>
              {i === activeDay ? <MaterialIcons name="edit" size={13} color="#FFFFFF" style={{ marginLeft: 6 }} /> : null}
            </Pressable>
          ))}
          <Pressable onPress={addDay} style={styles.addDayButton} hitSlop={8}>
            <MaterialIcons name="add" size={18} color={colors.primaryInk} />
          </Pressable>
        </ScrollView>

        <View style={{ gap: 12 }}>
          <SectionHeader
            title={t('common.exercices')}
            actionLabel={current.exercises.length > 1 ? (reordering ? t('member.reorder_done') : t('member.reorder_action')) : undefined}
            onAction={() => setReordering((v) => !v)}
          />
          {reordering ? <Text style={styles.reorderHint}>{t('member.reorder_hint')}</Text> : null}
          {current.exercises.length === 0 ? (
            <EmptyState icon="playlist-add" title={t('common.aucun_exercice')} text={t('common.ajoutez_des_exercices_depuis_la')} tone="primary" />
          ) : reordering ? (
            <ReorderList
              items={current.exercises.map((ex) => ({ key: ex.uid, title: ex.name, subtitle: t('member.serie_3', { length: ex.sets.length, v2: ex.sets.length > 1 ? 's' : '' }) }))}
              onReorder={(from, to) => reorderExercise(activeDay, from, to)}
            />
          ) : (
            current.exercises.map((ex, i) => (
              <ExerciseEditorCard
                key={ex.uid}
                mediaKey={mediaOf.get(ex.exerciseId) ?? null}
                name={ex.name}
                sets={ex.sets}
                onChangeSet={(index, field, value) =>
                  updateExercise(activeDay, i, (sets) => sets.map((st, k) => (k === index ? { ...st, [field]: value } : st)))
                }
                onAddSet={() =>
                  updateExercise(activeDay, i, (sets) => {
                    const last = sets[sets.length - 1];
                    return renumber([...sets, { setNumber: sets.length + 1, reps: last?.reps ?? '', weightKg: last?.weightKg ?? '' }]);
                  })
                }
                onRemoveSet={(index) => updateExercise(activeDay, i, (sets) => renumber(sets.filter((_, k) => k !== index)))}
                onRemove={() => setPendingRemove({ day: activeDay, index: i })}
                onPressHeader={() => router.push(`/(member)/exercises/${ex.exerciseId}`)}
              />
            ))
          )}

          <Pressable
            style={({ pressed }) => [styles.addExerciseButton, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push({ pathname: '/(member)/exercises', params: { pickFor: String(activeDay), programId: params.programId, returnTo: 'builder' } })}
          >
            <MaterialIcons name="add" size={22} color={colors.primaryInk} />
            <Text style={styles.addExerciseText}>{t('common.ajouter_un_exercice')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [styles.saveShadow, pressed && { transform: [{ scale: 0.98 }] }, saving && { opacity: 0.7 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButton}>
            <MaterialIcons name="check" size={24} color={colors.primaryContrast} />
            <Text style={styles.saveText}>
              {saving ? t('common.enregistrement') : isEditing ? t('common.enregistrer_les_modifications') : t('member.enregistrer_le_programme')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      <BottomSheet visible={pendingRemove !== null} onClose={() => setPendingRemove(null)}>
        <View style={styles.confirmIcon}>
          <MaterialIcons name="delete-outline" size={30} color={colors.dangerInk} />
        </View>
        <Text style={styles.confirmTitle}>{t('member.remove_exercise_title')}</Text>
        <Text style={styles.confirmText}>
          {t('member.remove_exercise_text', { name: pendingRemove ? days[pendingRemove.day]?.exercises[pendingRemove.index]?.name ?? '' : '' })}
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            label={t('member.remove_exercise_confirm')}
            variant="danger"
            onPress={() => {
              if (pendingRemove) removeExercise(pendingRemove.day, pendingRemove.index);
              setPendingRemove(null);
            }}
          />
          <Button label={t('common.annuler')} onPress={() => setPendingRemove(null)} variant="outline" />
        </View>
      </BottomSheet>

      <BottomSheet visible={renamingDay} onClose={() => setRenamingDay(false)}>
        <Text style={styles.sheetTitle}>{t('member.nom_du_jour')}</Text>
        <TextInput
          value={dayNameDraft}
          onChangeText={setDayNameDraft}
          style={styles.sheetInput}
          placeholder={t('member.ex_poussee_tirage_jambes')}
          placeholderTextColor={colors.muted}
          autoFocus
          onSubmitEditing={confirmRenameDay}
          returnKeyType="done"
        />
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('member.enregistrer')} onPress={confirmRenameDay} />
          <Button label={t('common.annuler')} onPress={() => setRenamingDay(false)} variant="outline" />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    nameCard: { padding: 16, gap: 6, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, },
    nameEditIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    nameInput: {
      flex: 1, height: 46, paddingHorizontal: 0, fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.5, color: colors.text,
    },
    summary: { flexDirection: 'row', paddingVertical: 18, borderRadius: radii.xl, overflow: 'hidden' },
    summaryDeco: { position: 'absolute', right: -40, top: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.08)' },
    summaryCol: { flex: 1, minWidth: 0, paddingHorizontal: 18, gap: 6 },
    summaryColDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.3)' },
    summaryLabel: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' },
    summaryValue: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -1, color: '#FFFFFF' },
    summaryUnit: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0, color: 'rgba(255,255,255,0.7)' },
    reorderHint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: -4 },
    confirmIcon: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft, marginBottom: 14 },
    confirmTitle: { fontFamily: fonts.headBold, fontSize: 19, letterSpacing: -0.3, color: colors.text, textAlign: 'center' },
    confirmText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, lineHeight: 20, textAlign: 'center', marginTop: 6 },
    sheetInput: { height: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text, backgroundColor: colors.surface },
    dayTabs: { gap: 8 },
    dayTab: {
      flexDirection: 'row', height: 38, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center',
      justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    dayTabText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    dayTabTextActive: { color: colors.primaryContrast },
    addDayButton: {
      width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: colors.primaryBorder,
      backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
    },
    addExerciseButton: {
      minHeight: 56, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primarySoft,
    },
    addExerciseText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    sheetTitle: { fontFamily: fonts.headBold, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
    saveShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    saveButton: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
