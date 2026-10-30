import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../../../src/theme/tokens';
import { useTheme } from '../../../../../src/theme/ThemeContext';
import { useProgramDetail } from '../../../../../src/hooks/useCoachSessions';
import { Banner, BottomSheet, EmptyState, ScreenTitle, DetailSkeleton } from '../../../../../src/components/ui';
import { WorkoutHeroCard } from '../../../../../src/components/training/WorkoutHeroCard';
import { Button } from '../../../../../src/components/Button';
import { SetTableRow, type SetRowState } from '../../../../../src/components/training/SetTableRow';
import {
  useMyWorkouts,
  useUpdateOwnProgram,
  type ProgramDayInput,
  type ProgramExerciseInput,
} from '../../../../../src/hooks/useCoaching';
import type { SetDraft } from '../../../../../src/components/training/SetRow';
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from '../../../../../src/hooks/useSessionDraft';
import { useNetworkStatusContext } from '../../../../../src/hooks/NetworkStatusContext';
import { useExercisePickStore } from '../../../../../src/store/exercisePick';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../../../../src/i18n';

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
  useTranslation();
  const { programId, dayId, pickedExerciseId, pickedExerciseName, pickedExerciseSets } = useLocalSearchParams<{
    programId: string;
    dayId: string;
    pickedExerciseId?: string;
    pickedExerciseName?: string;
    pickedExerciseSets?: string;
  }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: program, isLoading, isError, refetch } = useProgramDetail(programId);
  const { data: workouts, isLoading: isLoadingWorkouts } = useMyWorkouts();
  const updateProgram = useUpdateOwnProgram();
  const { isOnline } = useNetworkStatusContext();
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
  const [, setRestTotal] = useState(90);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saveChoiceOpen, setSaveChoiceOpen] = useState(false);
  const [removedExerciseIds, setRemovedExerciseIds] = useState<Set<string>>(new Set());
  const [foundDraft, setFoundDraft] = useState(() => (programId && dayId ? readSessionDraft(programId, dayId) : null));
  const [draftPromptVisible, setDraftPromptVisible] = useState(() => !!foundDraft);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [startedAtMs] = useState(() => Date.now() - (foundDraft?.elapsedSeconds ?? 0) * 1000);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const exerciseOffsets = useRef<Record<string, number>>({});
  const lastScrolledExerciseId = useRef<string | null>(null);

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => parent?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  const resumeFromDraft = () => {
    if (!foundDraft) return;
    setSets(foundDraft.sets);
    setAddedExercises(foundDraft.addedExercises);
    setRemovedExerciseIds(new Set(foundDraft.removedExerciseIds));
    setElapsedSeconds(foundDraft.elapsedSeconds);
    hydratedRef.current = true;
    setDraftPromptVisible(false);
  };

  const discardDraft = () => {
    if (programId && dayId) clearSessionDraft(programId, dayId);
    setFoundDraft(null);
    setDraftPromptVisible(false);
  };

  useEffect(() => {
    if (!day || isLoadingWorkouts || hydratedRef.current || draftPromptVisible) return;
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
  }, [day, workouts, lastWeightByExercise, isLoadingWorkouts, draftPromptVisible]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAtMs) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startedAtMs]);

  useEffect(() => {
    if (!programId || !dayId || !hydratedRef.current || sets.length === 0) return;
    const t = setTimeout(() => {
      writeSessionDraft({
        programId,
        dayId,
        startedAt: startedAtMs,
        elapsedSeconds,
        sets,
        addedExercises,
        removedExerciseIds: Array.from(removedExerciseIds),
      });
    }, 800);
    return () => clearTimeout(t);
  }, [programId, dayId, sets, addedExercises, removedExerciseIds, elapsedSeconds, startedAtMs]);

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

  const pick = useExercisePickStore((st) => st.pick);
  const clearPick = useExercisePickStore((st) => st.clear);

  // Exercice ajouté depuis la bibliothèque : l'écran est resté monté, on lui passe le choix via le store.
  useEffect(() => {
    let incoming: { exerciseId: string; name: string; sets: SetDraft[] } | null = null;
    if (pick && pick.target === 'session') {
      incoming = { exerciseId: pick.exerciseId, name: pick.name, sets: pick.sets };
    } else if (pickedExerciseId && pickedExerciseName && pickedExerciseSets) {
      incoming = { exerciseId: pickedExerciseId, name: pickedExerciseName, sets: JSON.parse(pickedExerciseSets) as SetDraft[] };
    }
    if (!incoming) return;
    const { exerciseId, name, sets: draftSets } = incoming;
    setAddedExercises((prev) => (prev.some((e) => e.exerciseId === exerciseId) ? prev : [...prev, { exerciseId, name }]));
    setRemovedExerciseIds((prev) => {
      if (!prev.has(exerciseId)) return prev;
      const next = new Set(prev);
      next.delete(exerciseId);
      return next;
    });
    setSets((prev) => [
      ...prev.filter((s) => s.exerciseId !== exerciseId),
      ...draftSets.map((d, i) => ({
        exerciseId,
        exerciseName: name,
        setNumber: i + 1,
        previousLabel: '—',
        weightKg: d.weightKg ?? '',
        weightTouched: !!d.weightKg,
        reps: d.reps ?? '',
        restSeconds: 90,
        done: false,
        isExtraSet: false,
      })),
    ]);
    setActiveExerciseId(exerciseId);
    if (pick) clearPick();
    if (pickedExerciseId) {
      router.setParams({ pickedExerciseId: undefined, pickedExerciseName: undefined, pickedExerciseSets: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, pickedExerciseId]);

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
      setError(i18n.t('member.saisissez_un_nombre_de_repetitions'));
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

  const goToSummary = (summaryDayId: string | undefined = dayId) => {
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
        dayId: summaryDayId,
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
      {
        onSuccess: (updated) => {
          setSaveChoiceOpen(false);
          // La mise à jour du programme régénère ses jours : on récupère l'identifiant du jour équivalent.
          const newDayId = updated?.days?.find((d) => d.dayOfWeek === day.dayOfWeek)?.id;
          goToSummary(newDayId);
        },
      },
    );
  };

  const handleKeepProgramAndFinish = () => {
    setSaveChoiceOpen(false);
    goToSummary();
  };

  if ((isLoading || isLoadingWorkouts) && !program) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  if ((isError || !isOnline) && !day) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            icon="cloud-off"
            title={i18n.t('member.seance_indisponible_hors_ligne')}
            text={i18n.t('member.impossible_de_recuperer_ce_programme')}
            tone="danger"
            actionLabel={i18n.t('common.reessayer')}
            onAction={() => refetch()}
          />
          <Pressable style={styles.addExerciseButton} onPress={() => router.back()}>
            <Text style={styles.addExerciseText}>{i18n.t('common.retour')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!day) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            icon="error-outline"
            title={i18n.t('member.jour_introuvable')}
            text={i18n.t('member.ce_jour_de_programme_nexiste')}
            tone="danger"
          />
          <Pressable style={styles.addExerciseButton} onPress={() => router.back()}>
            <Text style={styles.addExerciseText}>{i18n.t('common.retour')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoadingWorkouts && !workouts) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const totalSets = sets.length;
  const doneSetsList = sets.filter((s) => s.done);
  const doneSets = doneSetsList.length;
  const volume = doneSetsList.reduce((sum, s) => sum + (Number(s.weightKg) || 0) * (Number(s.reps) || 0), 0);
  const progressRatio = totalSets > 0 ? doneSets / totalSets : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable style={styles.back} onPress={() => setExitConfirmVisible(true)} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
            <Text style={styles.backText}>{i18n.t('member.quitter')}</Text>
          </Pressable>
          <View style={styles.liveTag}>
            <Text style={styles.liveTagText}>{i18n.t('member.en_cours')}</Text>
          </View>
        </View>

        <ScreenTitle title={day.label ?? program?.name ?? i18n.t('member.seance')} subtitle={i18n.t('member.suivi_des_exercices_et_des')} />

        <WorkoutHeroCard
          duration={`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
          progress={progressRatio}
          ringLabel={`${Math.round(progressRatio * 100)}%`}
          volume={`${Math.round(volume).toLocaleString(dateLocale())} kg`}
          sets={`${doneSets}/${totalSets}`}
        />

        {restSecondsLeft !== null ? (
          <View style={styles.restBanner}>
            <MaterialIcons name="timer" size={24} color={colors.primaryInk} />
            <View style={{ flex: 1 }}>
              <Text style={styles.restLabel}>{i18n.t('member.repos')}</Text>
              <Text style={styles.restTime}>
                {Math.floor(restSecondsLeft / 60)}:{String(restSecondsLeft % 60).padStart(2, '0')}
              </Text>
            </View>
            <Pressable style={styles.restSkip} onPress={() => setRestSecondsLeft(0)}>
              <Text style={styles.restSkipText}>{i18n.t('member.passer')}</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        {exerciseGroups.map(([exId, exSets], exIndex) => {
          const exDoneCount = exSets.filter((s) => s.done).length;
          const isExerciseDone = exDoneCount === exSets.length;
          const isCurrentExercise = exIndex === currentExerciseIndex && !isExerciseDone;
          const localCurrentSetIndex = exSets.findIndex((s) => !s.done);

          return (
            <View key={exId}>
              <View
                style={[styles.exerciseBlock, cardShadow, !isCurrentExercise && !isExerciseDone && styles.exerciseBlockIdle]}
                onLayout={(e) => {
                  exerciseOffsets.current[exId] = e.nativeEvent.layout.y;
                }}
              >
                <Pressable
                  style={styles.exerciseHeaderRow}
                  onPress={() => {
                    setActiveExerciseId(exId);
                    router.push(`/(member)/exercises/${exId}`);
                  }}
                >
                  <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exerciseThumb}>
                    <MaterialIcons name="fitness-center" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.exerciseName} numberOfLines={1}>{exSets[0]?.exerciseName}</Text>
                    <Text style={styles.exerciseMeta}>{i18n.t('member.exercice_sur', { v1: exIndex + 1, length: exerciseGroups.length })}</Text>
                  </View>
                  <View style={[styles.progTag, isExerciseDone ? styles.progTagDone : isCurrentExercise ? styles.progTagCurrent : null]}>
                    <Text style={[styles.progTagText, isExerciseDone ? styles.progTagTextDone : isCurrentExercise ? styles.progTagTextCurrent : null]}>
                      {exDoneCount}/{exSets.length}
                    </Text>
                  </View>
                  {exerciseGroups.length > 1 ? (
                    <Pressable style={styles.trashButton} onPress={() => removeExercise(exId)} hitSlop={6} accessibilityLabel={i18n.t('member.retirer_lexercice')}>
                      <MaterialIcons name="delete-outline" size={22} color={colors.dangerInk} />
                    </Pressable>
                  ) : null}
                </Pressable>

                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 34, textAlign: 'center' }]}>{i18n.t('member.serie_2')}</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>{i18n.t('member.kg_2')}</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>{i18n.t('member.reps')}</Text>
                  <View style={{ width: 44 }} />
                </View>
                {exSets.map((s, i) => {
                  const globalIdx = globalIndexOf(s.exerciseId, s.setNumber);
                  const isGlobalActive = exIndex === currentExerciseIndex && i === localCurrentSetIndex;
                  const state: SetRowState = s.done ? 'done' : isGlobalActive ? 'current' : 'todo';
                  return (
                    <SetTableRow
                      key={s.setNumber}
                      setNumber={s.setNumber}
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
                  <Text style={styles.addSetText}>{i18n.t('member.ajouter_une_serie')}</Text>
                </Pressable>
              </View>
            </View>
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
          <MaterialIcons name="add" size={22} color={colors.primaryInk} />
          <Text style={styles.addExerciseText}>{i18n.t('common.ajouter_un_exercice')}</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={currentSetIndex >= 0 ? handleValidate : handleFinish}
          style={({ pressed }) => [styles.validateShadow, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.validateButton}>
            <MaterialIcons name={currentSetIndex >= 0 ? 'check' : 'flag'} size={24} color={colors.primaryContrast} />
            <Text style={styles.validateButtonText}>
              {currentSetIndex >= 0 ? i18n.t('member.valider_la_serie', { setNumber: currentSets[currentSetIndex]?.setNumber }) : i18n.t('member.terminer_la_seance')}
            </Text>
          </LinearGradient>
        </Pressable>
        {currentSetIndex >= 0 ? (
          <Pressable style={styles.finishLink} onPress={handleFinish}>
            <Text style={styles.finishLinkText}>{i18n.t('member.terminer_la_seance')}</Text>
          </Pressable>
        ) : null}
      </View>

      <BottomSheet visible={saveChoiceOpen} onClose={() => setSaveChoiceOpen(false)}>
        <Text style={styles.sheetTitle}>{i18n.t('member.programme_modifie')}</Text>
        <Text style={styles.sheetText}>{i18n.t('member.vous_avez_change_des_exercices', { name: program?.name })}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label={i18n.t('member.mettre_a_jour_le_programme')}
            onPress={handleUpdateProgramAndFinish}
            loading={updateProgram.isPending}
          />
          <Button label={i18n.t('member.garder_le_programme_enregistrer_juste')} onPress={handleKeepProgramAndFinish} variant="outline" />
        </View>
      </BottomSheet>

      <BottomSheet visible={draftPromptVisible} onClose={discardDraft}>
        <Text style={styles.sheetTitle}>{i18n.t('member.reprendre_la_seance_en_cours')}</Text>
        <Text style={styles.sheetText}>{i18n.t('member.vous_avez_une_progression_sauvegardee', { v1: foundDraft
            ? i18n.t('member.draft_at', { time: new Date(foundDraft.savedAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) })
            : '' })}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={i18n.t('member.reprendre')} onPress={resumeFromDraft} />
          <Button label={i18n.t('member.recommencer')} onPress={discardDraft} variant="outline" />
        </View>
      </BottomSheet>

      <BottomSheet visible={exitConfirmVisible} onClose={() => setExitConfirmVisible(false)}>
        <Text style={styles.sheetTitle}>{i18n.t('member.abandonner_la_seance')}</Text>
        <Text style={styles.sheetText}>{i18n.t('member.votre_progression_reste_sauvegardee_et')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label={i18n.t('member.abandonner')}
            onPress={() => {
              setExitConfirmVisible(false);
              router.navigate(`/(member)/program/${programId}`);
            }}
            variant="secondary"
          />
          <Button label={i18n.t('member.continuer_la_seance')} onPress={() => setExitConfirmVisible(false)} variant="outline" />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.lg, gap: 12, paddingBottom: 190 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    liveTag: { backgroundColor: colors.successSoft, borderRadius: radii.full, paddingHorizontal: 11, paddingVertical: 5 },
    liveTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.successInk },
    restBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySoft, borderRadius: 20,
      paddingVertical: 10, paddingLeft: 16, paddingRight: 10,
    },
    restLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, color: colors.primaryInk },
    restTime: { fontFamily: fonts.head, fontSize: 24, color: colors.primaryInk },
    restSkip: { minHeight: 44, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    restSkipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
    exerciseBlock: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
    },
    exerciseBlockIdle: { opacity: 0.75 },
    exerciseHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    exerciseThumb: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    exerciseName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, textTransform: 'capitalize' },
    exerciseMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    progTag: { backgroundColor: colors.surface2, borderRadius: radii.full, paddingHorizontal: 11, paddingVertical: 5 },
    progTagCurrent: { backgroundColor: colors.primarySoft },
    progTagDone: { backgroundColor: colors.successSoft },
    progTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
    progTagTextCurrent: { color: colors.primaryInk },
    progTagTextDone: { color: colors.successInk },
    tableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tableHeaderText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.muted, letterSpacing: 0.6 },
    addSetButton: {
      minHeight: 44, marginTop: 4, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    addSetText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    trashButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
    addExerciseButton: {
      minHeight: 56, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primarySoft,
    },
    addExerciseText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl, gap: 4,
    },
    validateShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    validateButton: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    validateButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    finishLink: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
    finishLinkText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
  });
}
