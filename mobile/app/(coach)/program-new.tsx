import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { Banner, ScreenTitle } from '../../src/components/ui';
import { ExerciseEditorCard } from '../../src/components/training/ExerciseEditorCard';
import type { SetDraft } from '../../src/components/training/SetRow';
import {
  useAssignProgram,
  useCoachStudents,
  useProgramDetail,
  type AssignProgramExerciseInput,
} from '../../src/hooks/useCoachSessions';
import { useExercisePickStore } from '../../src/store/exercisePick';
import { estimateMinutes } from '../../src/components/coach/programStatus';
import { ApiError } from '../../src/api/client';

const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'] as const;
const GOALS: { value: string; icon: keyof typeof MaterialIcons.glyphMap; sub: string }[] = [
  { value: 'Perte de poids', icon: 'local-fire-department', sub: 'Brûler des calories' },
  { value: 'Masse', icon: 'fitness-center', sub: 'Gagner du muscle' },
  { value: 'Endurance', icon: 'directions-run', sub: 'Tenir l’effort' },
  { value: 'Mobilité', icon: 'self-improvement', sub: 'Gagner en souplesse' },
];

type DraftExercise = { exerciseId: string; name: string; sets: SetDraft[] };

function summarizeReps(sets: SetDraft[]): string {
  const reps = sets.map((s) => s.reps).filter(Boolean);
  if (reps.length === 0) return '—';
  return new Set(reps).size === 1 ? reps[0] : `${reps[0]}-${reps[reps.length - 1]}`;
}

/** Nouveau programme (coach) : nom, niveau, objectif, destinataires et exercices avec leurs séries.
 * Le programme est soumis à la validation de l'admin ; une fois accepté il devient visible des adhérents. */
export default function CoachProgramNewScreen() {
  const { duplicateFrom } = useLocalSearchParams<{ duplicateFrom?: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [level, setLevel] = useState<string>('Débutant');
  const [goal, setGoal] = useState<string>('Perte de poids');
  const [audience, setAudience] = useState<string>('ALL'); // 'ALL' ou id d'un adhérent
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  const assignProgram = useAssignProgram();
  const { data: students } = useCoachStudents();
  const { data: source } = useProgramDetail(duplicateFrom);
  const pick = useExercisePickStore((s) => s.pick);
  const clearPick = useExercisePickStore((s) => s.clear);

  // Duplication : on repart des données d'un programme existant.
  useEffect(() => {
    if (!source) return;
    setName(`${source.name} (copie)`);
    if (source.level) setLevel(source.level);
    if (source.goal) setGoal(source.goal);
    setExercises(
      source.days.flatMap((d) =>
        d.exercises.map((ex) => ({
          exerciseId: ex.exercise.id,
          name: ex.exercise.name,
          sets:
            ex.setDetails.length > 0
              ? ex.setDetails.map((s) => ({ setNumber: s.setNumber, reps: s.reps ? String(s.reps) : '', weightKg: s.weightKg ? String(Number(s.weightKg)) : '' }))
              : Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, reps: ex.reps, weightKg: '' })),
        })),
      ),
    );
  }, [source]);

  // Exercice choisi dans la bibliothèque (via le store, l'écran est resté monté).
  useEffect(() => {
    if (!pick || pick.target !== 'builder') return;
    setExercises((prev) => [...prev, { exerciseId: pick.exerciseId, name: pick.name, sets: pick.sets }]);
    clearPick();
  }, [pick, clearPick]);

  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);

  const updateSets = (index: number, update: (sets: SetDraft[]) => SetDraft[]) =>
    setExercises((prev) => prev.map((e, i) => (i === index ? { ...e, sets: update(e.sets) } : e)));
  const renumber = (sets: SetDraft[]) => sets.map((s, i) => ({ ...s, setNumber: i + 1 }));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(coach)/(tabs)/programs'));

  const handleSubmit = () => {
    setError(null);
    if (exercises.length === 0) {
      setError('Ajoutez au moins un exercice.');
      return;
    }
    assignProgram.mutate(
      {
        name: name.trim() || 'Nouveau programme',
        level,
        goal,
        assignedToId: audience === 'ALL' ? undefined : audience,
        days: [
          {
            dayOfWeek: 1,
            label: 'Séance complète',
            exercises: exercises.map<AssignProgramExerciseInput>((e) => ({
              exerciseId: e.exerciseId,
              sets: e.sets.length,
              reps: summarizeReps(e.sets),
              setDetails: e.sets.map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps ? Number(s.reps) : undefined,
                weightKg: s.weightKg ? Number(s.weightKg) : undefined,
              })),
            })),
          },
        ],
      },
      {
        onSuccess: () => router.replace('/(coach)/(tabs)/programs'),
        onError: (e) => setError(e instanceof ApiError ? e.message : 'Impossible de soumettre le programme.'),
      },
    );
  };

  const audienceRows = [
    { id: 'ALL', label: 'Tous les adhérents', sub: 'Visible par tous les adhérents', icon: 'groups' as const },
    ...(students ?? []).map((s) => ({
      id: s.id,
      label: `${s.firstName} ${s.lastName.charAt(0)}.`,
      sub: 'Programme personnel',
      icon: 'person' as const,
    })),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Programmes</Text>
        </Pressable>
        <ScreenTitle title="Nouveau programme" subtitle="Sera soumis à validation de l’admin." />

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <TextInput value={name} onChangeText={setName} placeholder="Nom du programme" placeholderTextColor={colors.muted} style={styles.nameInput} />

        <View>
          <Text style={styles.label}>Niveau</Text>
          <View style={styles.pillRow}>
            {LEVELS.map((l) => {
              const active = level === l;
              return (
                <Pressable key={l} onPress={() => setLevel(l)} style={styles.pill}>
                  {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  ) : null}
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{l}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Objectif</Text>
          <View style={styles.goalGrid}>
            {GOALS.map((g) => {
              const active = goal === g.value;
              return (
                <Pressable key={g.value} onPress={() => setGoal(g.value)} style={[styles.goalCard, active && styles.goalCardActive]}>
                  {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.goalTile}>
                      <MaterialIcons name={g.icon} size={22} color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.goalTile, { backgroundColor: colors.surface2 }]}>
                      <MaterialIcons name={g.icon} size={22} color={colors.primaryInk} />
                    </View>
                  )}
                  <Text style={styles.goalLabel}>{g.value}</Text>
                  <Text style={styles.goalSub}>{g.sub}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Destinataires</Text>
          <View style={[styles.audienceCard, cardShadow]}>
            {audienceRows.map((r) => {
              const active = audience === r.id;
              return (
                <Pressable key={r.id} onPress={() => setAudience(r.id)} style={[styles.audienceRow, active && styles.audienceRowActive]}>
                  {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.audienceTile}>
                      <MaterialIcons name={r.icon} size={22} color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.audienceTile, { backgroundColor: colors.surface2 }]}>
                      <MaterialIcons name={r.icon} size={22} color={colors.primaryInk} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.audienceLabel}>{r.label}</Text>
                    <Text style={styles.audienceSub}>{r.sub}</Text>
                  </View>
                  <View style={[styles.radio, active && { borderColor: colors.primary }]}>{active ? <View style={styles.radioDot} /> : null}</View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.notice}>
          <MaterialIcons name="verified-user" size={22} color={colors.primaryInk} />
          <Text style={styles.noticeText}>
            Le programme est envoyé à l’admin. Une fois accepté, il devient <Text style={{ fontFamily: fonts.bodyBold }}>visible par {audience === 'ALL' ? 'tous les adhérents' : 'l’adhérent choisi'}</Text>.
          </Text>
        </View>

        <View style={[styles.summary, cardShadow]}>
          <Text style={styles.summaryValue}>
            {totalSets}
            <Text style={styles.summaryUnit}> séries</Text>
          </Text>
          <Text style={styles.summaryMeta}>{exercises.length} exercice{exercises.length > 1 ? 's' : ''} · ~{estimateMinutes(totalSets)} min</Text>
        </View>

        <View style={{ gap: 12 }}>
          {exercises.map((e, i) => (
            <ExerciseEditorCard
              key={`${e.exerciseId}-${i}`}
              name={e.name}
              sets={e.sets}
              onChangeSet={(index, field, value) => updateSets(i, (sets) => sets.map((s, k) => (k === index ? { ...s, [field]: value } : s)))}
              onAddSet={() =>
                updateSets(i, (sets) => {
                  const last = sets[sets.length - 1];
                  return renumber([...sets, { setNumber: sets.length + 1, reps: last?.reps ?? '10', weightKg: last?.weightKg ?? '' }]);
                })
              }
              onRemoveSet={(index) => updateSets(i, (sets) => renumber(sets.filter((_, k) => k !== index)))}
              onRemove={() => setExercises((prev) => prev.filter((_, k) => k !== i))}
              onPressHeader={() => router.push(`/(member)/exercises/${e.exerciseId}`)}
            />
          ))}

          <Pressable
            style={({ pressed }) => [styles.addExercise, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push({ pathname: '/(coach)/exercises', params: { pickFor: '0', returnTo: 'builder' } })}
          >
            <MaterialIcons name="add" size={22} color={colors.primaryInk} />
            <Text style={styles.addExerciseText}>Ajouter un exercice</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={assignProgram.isPending}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, assignProgram.isPending && { opacity: 0.7 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="send" size={22} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{assignProgram.isPending ? 'Envoi…' : 'Soumettre à validation'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 150 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    nameInput: {
      height: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18,
      fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text, backgroundColor: colors.surface,
    },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginBottom: 8 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      height: 36, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    pillText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    pillTextActive: { color: colors.primaryContrast },
    goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    goalCard: {
      width: '48.5%', padding: 14, gap: 4, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    goalCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    goalTile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    goalLabel: { fontFamily: fonts.head, fontSize: 15, letterSpacing: -0.3, color: colors.text },
    goalSub: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted },
    audienceCard: { padding: 4, gap: 2, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    audienceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
    audienceRowActive: { backgroundColor: colors.primarySoft },
    audienceTile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    audienceLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    audienceSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
    notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.primarySoft, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
    noticeText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.primaryInk },
    summary: { padding: 16, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    summaryValue: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -1, color: colors.text },
    summaryUnit: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.muted, letterSpacing: 0 },
    summaryMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    addExercise: {
      minHeight: 56, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primarySoft,
    },
    addExerciseText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
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
