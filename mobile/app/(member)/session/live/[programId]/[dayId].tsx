import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { controlHeight, fonts, radii, spacing } from '../../../../../src/theme/tokens';
import { useTheme } from '../../../../../src/theme/ThemeContext';
import { useProgramDetail } from '../../../../../src/hooks/useCoachSessions';
import { Banner, BottomSheet, CircularTimer } from '../../../../../src/components/ui';
import { Button } from '../../../../../src/components/Button';
import { SetTableRow, type SetRowState } from '../../../../../src/components/training/SetTableRow';
import {
  useMyWorkouts,
  useUpdateOwnProgram,
  type ProgramDayInput,
  type ProgramExerciseInput,
} from '../../../../../src/hooks/useCoaching';
import type { SetDraft } from '../../../../../src/components/training/SetRow';

interface LiveSet {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  previousLabel: string;
  weightKg: string;
  weightTouched: boolean;
  reps: string;
  restSeconds: number;
  done: boolean;
  isExtraSet: boolean;
}

interface AddedExercise {
  exerciseId: string;
  name: string;
}

function summarizeReps(reps: string[]): string {
  const filtered = reps.filter(Boolean);
  if (filtered.length === 0) return '—';
  const unique = new Set(filtered);
  return unique.size === 1 ? filtered[0] : `${filtered[0]}-${filtered[filtered.length - 1]}`;
}

/** Séance guidée — FitZone App Entraînement.dc.html, D3. Tous les exercices du
 * jour sont affichés en continu (terminés, en cours, à venir), minuteur de
 * repos en anneau circulaire entre les séries. */
export default function LiveSessionScreen() {
  const { programId, dayId, pickedExerciseId, pickedExerciseName, pickedExerciseSets } = useLocalSearchParams<{
    programId: string;
    dayId: string;
    pickedExerciseId?: string;
    pickedExerciseName?: string;
    pickedExerciseSets?: string;
  }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: program, isLoading } = useProgramDetail(programId);
  const { data: workouts, isLoading: isLoadingWorkouts } = useMyWorkouts();
  const updateProgram = useUpdateOwnProgram();
  const day = program?.days.find((d) => d.id === dayId);
  const navigation = useNavigation();

  const lastWeightByExercise = useMemo(() => {
    const map = new Map<string, number>();
    if (!workouts) return map;
    const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const log of sorted) {
      for (const s of log.sets) {
        if (map.has(s.exerciseId) || !s.weightKg) continue;
        map.set(s.exerciseId, Number(s.weightKg));
      }
    }
    return map;
  }, [workouts]);

  const [sets, setSets] = useState<LiveSet[]>([]);
  const [addedExercises, setAddedExercises] = useState<AddedExercise[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [errorGlobalIndex, setErrorGlobalIndex] = useState<number | null>(null);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(90);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saveChoiceOpen, setSaveChoiceOpen] = useState(false);
  const [removedExerciseIds, setRemovedExerciseIds] = useState<Set<string>>(new Set());
  const startedAt = useRef(Date.now());
  const scrollRef = useRef<ScrollView>(null);
  const exerciseOffsets = useRef<Record<string, number>>({});
  const lastScrolledExerciseId = useRef<string | null>(null);
  const exerciseSwipeRefs = useRef<Map<string, Swipeable>>(new Map());

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => parent?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  useEffect(() => {
    if (!day || !workouts || hydratedRef.current) return;
    hydratedRef.current = true;
    const flattened: LiveSet[] = [];
    day.exercises.forEach((ex) => {
      const lastWeight = lastWeightByExercise.get(ex.exercise.id);
      const base = ex.setDetails.length > 0
        ? ex.setDetails
        : Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, reps: null, weightKg: null, restSeconds: ex.restSeconds }));
      base.forEach((s) => {
        const plannedOrLastWeight = s.weightKg ?? (lastWeight !== undefined ? String(lastWeight) : null);
        flattened.push({
          exerciseId: ex.exercise.id,
          exerciseName: ex.exercise.name,
          setNumber: s.setNumber,
          previousLabel: lastWeight !== undefined ? `${lastWeight} kg` : '—',
          weightKg: plannedOrLastWeight ? String(plannedOrLastWeight) : '',
          weightTouched: false,
          reps: s.reps ? String(s.reps) : '',
          restSeconds: s.restSeconds ?? ex.restSeconds ?? 90,
          done: false,
          isExtraSet: false,
        });
      });
    });
    setSets(flattened);
  }, [day, workouts, lastWeightByExercise]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (restSecondsLeft === null) return;
    if (restSecondsLeft <= 0) {
      setRestSecondsLeft(null);
      return;
    }
    const t = setTimeout(() => setRestSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [restSecondsLeft]);

  const exerciseGroups = useMemo(() => {
    const groups = new Map<string, LiveSet[]>();
    for (const s of sets) {
      if (removedExerciseIds.has(s.exerciseId)) continue;
      if (!groups.has(s.exerciseId)) groups.set(s.exerciseId, []);
      groups.get(s.exerciseId)!.push(s);
    }
    return Array.from(groups.entries());
  }, [sets, removedExerciseIds]);

  const firstUnfinishedExerciseIndex = exerciseGroups.findIndex(([, exSets]) => exSets.some((s) => !s.done));
  const autoExerciseIndex = firstUnfinishedExerciseIndex === -1 ? exerciseGroups.length - 1 : firstUnfinishedExerciseIndex;
  const activeExerciseIndexFromState = activeExerciseId ? exerciseGroups.findIndex(([exId]) => exId === activeExerciseId) : -1;
  const currentExerciseIndex = activeExerciseIndexFromState !== -1 ? activeExerciseIndexFromState : autoExerciseIndex;
  const currentGroup = exerciseGroups[currentExerciseIndex];
  const currentExerciseId = currentGroup?.[0];
  const currentSets = currentGroup?.[1] ?? [];
  const currentSetIndex = currentSets.findIndex((s) => !s.done);

  useEffect(() => {
    if (!currentExerciseId || lastScrolledExerciseId.current === currentExerciseId) return;
    const y = exerciseOffsets.current[currentExerciseId];
    if (y === undefined) return;
    lastScrolledExerciseId.current = currentExerciseId;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.sm), animated: true });
  }, [currentExerciseId]);

  useEffect(() => {
    if (!pickedExerciseId || !pickedExerciseName || !pickedExerciseSets) return;
    const draftSets: SetDraft[] = JSON.parse(pickedExerciseSets);
    setAddedExercises((prev) =>
      prev.some((e) => e.exerciseId === pickedExerciseId) ? prev : [...prev, { exerciseId: pickedExerciseId, name: pickedExerciseName }],
    );
    setSets((prev) => [
      ...prev,
      ...draftSets.map((d) => ({
        exerciseId: pickedExerciseId,
        exerciseName: pickedExerciseName,
        setNumber: d.setNumber,
        previousLabel: '—',
        weightKg: d.weightKg ?? '',
        weightTouched: !!d.weightKg,
        reps: d.reps ?? '',
        restSeconds: 90,
        done: false,
        isExtraSet: false,
      })),
    ]);
    setActiveExerciseId(pickedExerciseId);
    router.setParams({ pickedExerciseId: undefined, pickedExerciseName: undefined, pickedExerciseSets: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedExerciseId]);

  const updateSet = (globalIndex: number, patch: Partial<LiveSet>) => {
    setSets((prev) => prev.map((s, i) => (i === globalIndex ? { ...s, ...patch } : s)));
  };

  const globalIndexOf = (exerciseId: string, setNumber: number) =>
    sets.findIndex((s) => s.exerciseId === exerciseId && s.setNumber === setNumber);

  const handleChangeWeight = (globalIndex: number, exerciseId: string, value: string) => {
    setActiveExerciseId(exerciseId);
    setSets((prev) =>
      prev.map((s, i) => {
        if (i === globalIndex) return { ...s, weightKg: value, weightTouched: true };
        if (s.exerciseId === exerciseId && i > globalIndex && !s.weightTouched && !s.done) {
          return { ...s, weightKg: value };
        }
        return s;
      }),
    );
  };

  const addSet = (exerciseId: string) => {
    setActiveExerciseId(exerciseId);
    const group = exerciseGroups.find(([exId]) => exId === exerciseId);
    const exSets = group?.[1] ?? [];
    if (exSets.length === 0) return;
    const last = exSets[exSets.length - 1];
    const insertAt = globalIndexOf(exerciseId, last.setNumber) + 1;
    const newSet: LiveSet = {
      ...last,
      setNumber: last.setNumber + 1,
      weightKg: last.weightKg,
      weightTouched: false,
      reps: '',
      done: false,
      isExtraSet: true,
    };
    setSets((prev) => [...prev.slice(0, insertAt), newSet, ...prev.slice(insertAt)]);
  };

  const removeSet = (exerciseId: string, setNumber: number) => {
    setActiveExerciseId(exerciseId);
    setSets((prev) => {
      const next = prev.filter((s) => !(s.exerciseId === exerciseId && s.setNumber === setNumber));
      let renumber = 0;
      return next.map((s) => {
        if (s.exerciseId !== exerciseId) return s;
        renumber += 1;
        return s.setNumber === renumber ? s : { ...s, setNumber: renumber };
      });
    });
  };

  const removeExercise = (exerciseId: string) => {
    setRemovedExerciseIds((prev) => new Set(prev).add(exerciseId));
    setAddedExercises((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
  };

  const handleValidateSet = (globalIndex: number) => {
    const current = sets[globalIndex];
    if (!current || current.done) return;
    setActiveExerciseId(current.exerciseId);
    if (!current.reps || Number(current.reps) <= 0 || Number(current.reps) > 50) {
      setError('Saisissez un nombre de répétitions (1 à 50).');
      setErrorGlobalIndex(globalIndex);
      return;
    }
    setError(null);
    setErrorGlobalIndex(null);
    updateSet(globalIndex, { done: true });

    const exGroupIndex = exerciseGroups.findIndex(([exId]) => exId === current.exerciseId);
    const exSets = exerciseGroups[exGroupIndex]?.[1] ?? [];
    const isLastSetOfExercise = exSets[exSets.length - 1]?.setNumber === current.setNumber;
    const isLastExercise = exGroupIndex === exerciseGroups.length - 1;
    if (!isLastSetOfExercise || !isLastExercise) {
      setRestTotal(current.restSeconds);
      setRestSecondsLeft(current.restSeconds);
    }
  };

  const handleValidate = () => {
    if (currentSetIndex === -1 || !currentExerciseId) return;
    const idx = globalIndexOf(currentExerciseId, currentSets[currentSetIndex].setNumber);
    handleValidateSet(idx);
  };

  const hasProgramChanges = useMemo(() => {
    if (!day) return false;
    if (addedExercises.length > 0) return true;
    if (sets.some((s) => s.isExtraSet)) return true;
    for (const ex of day.exercises) {
      const exSets = exerciseGroups.find(([exId]) => exId === ex.exercise.id)?.[1] ?? [];
      const plannedCount = ex.setDetails.length > 0 ? ex.setDetails.length : ex.sets;
      if (exSets.length !== plannedCount) return true;
    }
    return false;
  }, [day, addedExercises, sets, exerciseGroups]);

  const goToSummary = () => {
    const doneSetsList = sets.filter((s) => s.done);
    const payload = doneSetsList.map((s) => ({
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      weightKg: s.weightKg ? Number(s.weightKg) : undefined,
      reps: s.reps ? Number(s.reps) : undefined,
    }));
    const avgRestSeconds = doneSetsList.length > 0
      ? Math.round(doneSetsList.reduce((sum, s) => sum + s.restSeconds, 0) / doneSetsList.length)
      : 0;
    router.replace({
      pathname: '/(member)/session/summary',
      params: {
        programId,
        dayId,
        workoutSets: JSON.stringify(payload),
        elapsedSeconds: String(elapsedSeconds),
        avgRestSeconds: String(avgRestSeconds),
      },
    });
  };

  const handleFinish = () => {
    if (hasProgramChanges) {
      setSaveChoiceOpen(true);
      return;
    }
    goToSummary();
  };

  const handleUpdateProgramAndFinish = () => {
    if (!program || !day) return;
    const updatedDay: ProgramDayInput = {
      dayOfWeek: day.dayOfWeek,
      label: day.label ?? undefined,
      exercises: exerciseGroups.map(([exerciseId, exSets]) => ({
        exerciseId,
        sets: exSets.length,
        reps: summarizeReps(exSets.map((s) => s.reps)),
        setDetails: exSets.map((s) => ({
          setNumber: s.setNumber,
          reps: s.reps ? Number(s.reps) : undefined,
          weightKg: s.weightKg ? Number(s.weightKg) : undefined,
          restSeconds: s.restSeconds,
        })),
      })),
    };
    const payload = {
      name: program.name,
      days: program.days.map((d) => (d.id === day.id ? updatedDay : {
        dayOfWeek: d.dayOfWeek,
        label: d.label ?? undefined,
        exercises: d.exercises.map<ProgramExerciseInput>((ex) => ({
          exerciseId: ex.exercise.id,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds ?? undefined,
          setDetails: ex.setDetails.map((s) => ({
            setNumber: s.setNumber,
            reps: s.reps ?? undefined,
            weightKg: s.weightKg ? Number(s.weightKg) : undefined,
            restSeconds: s.restSeconds ?? undefined,
          })),
        })),
      })),
    };
    updateProgram.mutate(
      { id: program.id, payload },
      { onSuccess: () => { setSaveChoiceOpen(false); goToSummary(); } },
    );
  };

  const handleKeepProgramAndFinish = () => {
    setSaveChoiceOpen(false);
    goToSummary();
  };

  if (isLoading || isLoadingWorkouts || !day) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const totalSets = sets.length;
  const doneSets = sets.filter((s) => s.done).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.navigate(`/(member)/program/${programId}`)} hitSlop={8}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.topBarTitle}>{day.label}</Text>
          <Text style={styles.topBarSub}>{minutes}:{String(seconds).padStart(2, '0')} écoulées</Text>
        </View>
        <Pressable style={styles.finishPill} onPress={handleFinish}>
          <Text style={styles.finishPillText}>Terminer</Text>
        </Pressable>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressSegments}>
          {exerciseGroups.map(([exId], i) => (
            <View key={exId} style={[styles.segment, i <= currentExerciseIndex && styles.segmentDone]} />
          ))}
        </View>
        <Text style={styles.progressCount}>{doneSets} / {totalSets} séries</Text>
      </View>

      {error ? (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xs }}>
          <Banner tone="danger" icon="error" text={error} />
        </View>
      ) : null}

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {exerciseGroups.map(([exId, exSets], exIndex) => {
          const exDoneCount = exSets.filter((s) => s.done).length;
          const isExerciseDone = exDoneCount === exSets.length;
          const isCurrentExercise = exIndex === currentExerciseIndex && !isExerciseDone;
          const localCurrentSetIndex = exSets.findIndex((s) => !s.done);

          return (
            <Swipeable
              key={exId}
              ref={(ref) => {
                if (ref) exerciseSwipeRefs.current.set(exId, ref);
                else exerciseSwipeRefs.current.delete(exId);
              }}
              enabled={exerciseGroups.length > 1}
              renderRightActions={
                exerciseGroups.length > 1
                  ? () => (
                      <Pressable
                        style={styles.deleteExerciseAction}
                        onPress={() => {
                          exerciseSwipeRefs.current.get(exId)?.close();
                          removeExercise(exId);
                        }}
                      >
                        <MaterialIcons name="delete-outline" size={22} color={colors.primaryContrast} />
                        <Text style={styles.deleteExerciseActionText}>Retirer</Text>
                      </Pressable>
                    )
                  : undefined
              }
              overshootRight={false}
            >
            <View
              style={[styles.exerciseBlock, isCurrentExercise && styles.exerciseBlockCurrent]}
              onLayout={(e) => {
                exerciseOffsets.current[exId] = e.nativeEvent.layout.y;
              }}
            >
              <Pressable style={styles.exerciseHeaderRow} onPress={() => setActiveExerciseId(exId)}>
                <View style={[styles.exerciseThumb, isExerciseDone && styles.exerciseThumbDone]}>
                  {isExerciseDone ? (
                    <MaterialIcons name="check" size={20} color={colors.primaryContrast} />
                  ) : (
                    <MaterialIcons name="fitness-center" size={20} color={colors.muted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseCounter}>
                    EXERCICE {exIndex + 1} SUR {exerciseGroups.length}
                    {isExerciseDone ? ' · TERMINÉ' : isCurrentExercise ? ' · EN COURS' : ''}
                  </Text>
                  <Text style={styles.exerciseName}>{exSets[0]?.exerciseName}</Text>
                  <Text style={styles.exerciseMeta}>{exSets.length} séries</Text>
                </View>
              </Pressable>

              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 40, textAlign: 'center' }]}>SÉRIE</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1 }]}>PRÉCÉDENT</Text>
                  <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'center' }]}>KG</Text>
                  <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'center' }]}>REP</Text>
                  <View style={{ width: 32 }} />
                </View>
                {exSets.map((s, i) => {
                  const globalIdx = globalIndexOf(s.exerciseId, s.setNumber);
                  const isGlobalActive = exIndex === currentExerciseIndex && i === localCurrentSetIndex;
                  const state: SetRowState = s.done ? 'done' : isGlobalActive ? 'current' : 'todo';
                  return (
                    <SetTableRow
                      key={s.setNumber}
                      setNumber={s.setNumber}
                      previousLabel={s.previousLabel}
                      weightKg={s.weightKg}
                      reps={s.reps}
                      state={state}
                      error={errorGlobalIndex === globalIdx && !!error}
                      onChangeWeight={(v) => handleChangeWeight(globalIdx, s.exerciseId, v)}
                      onChangeReps={(v) => {
                        setActiveExerciseId(s.exerciseId);
                        updateSet(globalIdx, { reps: v });
                      }}
                      onValidate={() => handleValidateSet(globalIdx)}
                      onRemove={exSets.length > 1 ? () => removeSet(s.exerciseId, s.setNumber) : undefined}
                    />
                  );
                })}

                <Pressable style={styles.addSetButton} onPress={() => addSet(exId)}>
                  <MaterialIcons name="add" size={18} color={colors.primaryInk} />
                  <Text style={styles.addSetText}>Ajouter une série</Text>
                </Pressable>
              </View>
            </View>
            </Swipeable>
          );
        })}

        <Pressable
          style={styles.addExerciseButton}
          onPress={() =>
            router.push({
              pathname: '/(member)/exercises',
              params: { pickFor: 'session', programId, returnTo: 'session-live', dayId },
            })
          }
        >
          <MaterialIcons name="library-add" size={18} color={colors.primaryInk} />
          <Text style={styles.addExerciseText}>Ajouter un exercice</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.validateButton}
          onPress={currentSetIndex >= 0 ? handleValidate : handleFinish}
        >
          <MaterialIcons name="check" size={18} color={colors.primaryContrast} />
          <Text style={styles.validateButtonText}>
            {currentSetIndex >= 0 ? `Valider la série ${currentSets[currentSetIndex]?.setNumber}` : 'Terminer la séance'}
          </Text>
        </Pressable>
      </View>

      <BottomSheet visible={restSecondsLeft !== null} onClose={() => setRestSecondsLeft(null)}>
        <View style={styles.restContent}>
          <Text style={styles.restLabel}>REPOS</Text>
          <View style={styles.restRing}>
            <CircularTimer progress={(restSecondsLeft ?? 0) / restTotal} size={160} strokeWidth={10} />
            <View style={styles.restCenter}>
              <Text style={styles.restTime}>
                {Math.floor((restSecondsLeft ?? 0) / 60)}:{String((restSecondsLeft ?? 0) % 60).padStart(2, '0')}
              </Text>
              <Text style={styles.restTotalText}>sur {Math.floor(restTotal / 60)}:{String(restTotal % 60).padStart(2, '0')}</Text>
            </View>
          </View>
          <View style={styles.restButtonsRow}>
            <Pressable style={styles.restButton} onPress={() => setRestSecondsLeft((s) => Math.max(0, (s ?? 0) - 15))}>
              <Text style={styles.restButtonText}>−15 s</Text>
            </Pressable>
            <Pressable style={styles.restButton} onPress={() => setRestSecondsLeft((s) => (s ?? 0) + 15)}>
              <Text style={styles.restButtonText}>+15 s</Text>
            </Pressable>
            <Pressable style={[styles.restButton, styles.restButtonPrimary]} onPress={() => setRestSecondsLeft(0)}>
              <Text style={styles.restButtonPrimaryText}>Passer</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet visible={saveChoiceOpen} onClose={() => setSaveChoiceOpen(false)}>
        <Text style={styles.sheetTitle}>Programme modifié</Text>
        <Text style={styles.sheetText}>
          Vous avez changé des exercices ou des séries par rapport au programme enregistré. Voulez-vous
          mettre à jour « {program?.name} » avec ces changements, ou garder le programme tel quel et
          enregistrer seulement cette séance ?
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label="Mettre à jour le programme"
            onPress={handleUpdateProgramAndFinish}
            loading={updateProgram.isPending}
          />
          <Button label="Garder le programme, enregistrer juste la séance" onPress={handleKeepProgramAndFinish} variant="outline" />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  topBarTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  topBarSub: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
  finishPill: { height: 32, paddingHorizontal: 14, borderRadius: radii.full, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  finishPillText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.dangerInk },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  progressSegments: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  segmentDone: { backgroundColor: colors.primary },
  progressCount: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.muted },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: 140, paddingTop: spacing.xs },
  exerciseBlock: { gap: spacing.sm, opacity: 0.6 },
  exerciseBlockCurrent: { opacity: 1 },
  exerciseHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseThumb: {
    width: 52, height: 52, borderRadius: radii.sm, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  exerciseThumbDone: { backgroundColor: colors.success },
  exerciseCounter: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.4, color: colors.primaryInk },
  exerciseName: { fontFamily: fonts.head, fontSize: 20, color: colors.text, textTransform: 'capitalize' },
  exerciseMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  table: {
    backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.sm, gap: 2,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  tableHeader: { flexDirection: 'row', gap: 8, paddingHorizontal: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableHeaderText: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.muted, letterSpacing: 0.3 },
  addSetButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, marginTop: 4, borderRadius: radii.xs,
  },
  addSetText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.primaryInk },
  deleteExerciseAction: {
    width: 84, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    gap: 2, borderRadius: radii.md, marginLeft: 8,
  },
  deleteExerciseActionText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.primaryContrast },
  addExerciseButton: {
    height: 48, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.primaryBorder, borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primarySoft,
  },
  addExerciseText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.primaryInk },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
  },
  validateButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: controlHeight, borderRadius: radii.sm, backgroundColor: colors.primary,
  },
  validateButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryContrast },
  restContent: { alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md },
  restLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, letterSpacing: 0.5, color: colors.muted },
  restRing: { alignItems: 'center', justifyContent: 'center' },
  restCenter: { position: 'absolute', alignItems: 'center' },
  restTime: { fontFamily: fonts.head, fontSize: 36, color: colors.text },
  restTotalText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  restButtonsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  restButton: {
    flex: 1, height: 44, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  restButtonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  restButtonPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  restButtonPrimaryText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryContrast },
  sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
  sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
  });
}
