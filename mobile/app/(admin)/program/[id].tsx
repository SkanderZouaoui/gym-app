import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useApproveProgram, useRejectProgram, useReviewPrograms } from '../../../src/hooks/useAdmin';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { BottomSheet, EmptyState } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import { muscleGroupLabel } from '../../../src/constants/muscleGroups';
import { estimateMinutes } from '../../../src/components/coach/programStatus';

/** Détail d'un programme proposé par un coach : contenu, puis approbation (publication) ou refus avec motif. */
export default function AdminProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: programs, isLoading, refetch } = useReviewPrograms();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const approve = useApproveProgram();
  const reject = useRejectProgram();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  const program = (programs ?? []).find((p) => p.id === id);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/programs'));

  if (isLoading && !program) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!program) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <EmptyState icon="fitness-center" title="Programme introuvable" text="Ce programme n'existe plus." tone="danger" actionLabel="Retour" onAction={goBack} />
        </View>
      </SafeAreaView>
    );
  }

  const exercises = program.days.flatMap((d) => d.exercises);
  const totalSets = exercises.reduce((s, e) => s + e.sets, 0);
  const muscles = Array.from(new Set(exercises.map((e) => e.exercise.muscleGroup).filter((g): g is string => !!g))).map(muscleGroupLabel);
  const pending = program.status === 'PENDING';

  const doApprove = () => approve.mutate(program.id, { onSuccess: goBack });
  const doReject = () =>
    reject.mutate({ id: program.id, note: note.trim() || undefined }, { onSuccess: () => { setRejecting(false); goBack(); } });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Programmes</Text>
        </Pressable>

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>Par {program.createdBy.firstName} {program.createdBy.lastName}</Text>
            </View>
            <Text style={styles.heroTitle}>{program.name}</Text>
            <View style={styles.heroChips}>
              {[program.level, program.goal].filter(Boolean).map((c) => (
                <View key={c as string} style={styles.heroChip}>
                  <Text style={styles.heroChipText}>{c}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {program.status === 'REJECTED' && program.rejectionNote ? (
          <View style={styles.rejection}>
            <MaterialIcons name="feedback" size={22} color={colors.dangerInk} />
            <Text style={styles.rejectionText}>
              <Text style={{ fontFamily: fonts.bodyBold }}>Motif du refus. </Text>
              {program.rejectionNote}
            </Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          {[
            { n: String(exercises.length), l: 'Exercices' },
            { n: String(totalSets), l: 'Séries' },
            { n: `~${estimateMinutes(totalSets)} min`, l: 'Durée' },
          ].map((s) => (
            <View key={s.l} style={[styles.statCard, cardShadow]}>
              <Text style={styles.statValue}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {muscles.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Muscles ciblés</Text>
            <View style={styles.chips}>
              {muscles.map((m) => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipText}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <Text style={styles.sectionTitle}>Exercices</Text>
          <View style={{ gap: 10 }}>
            {exercises.map((ex, i) => (
              <Pressable
                key={ex.id}
                style={[styles.exerciseCard, cardShadow]}
                onPress={() => router.push(`/(member)/exercises/${ex.exercise.id}`)}
              >
                <View style={styles.indexBadge}>
                  <Text style={styles.indexBadgeText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.exerciseName} numberOfLines={2}>{ex.exercise.name}</Text>
                  {ex.exercise.muscleGroup ? <Text style={styles.exerciseMeta}>{muscleGroupLabel(ex.exercise.muscleGroup)}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.exerciseSets}>{ex.sets} × {ex.reps}</Text>
                  <Text style={styles.exerciseMeta}>{ex.setDetails[0]?.weightKg ? `${Number(ex.setDetails[0].weightKg)} kg` : 'Poids du corps'}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        {pending ? (
          <View style={{ gap: 10, marginTop: 6 }}>
            <Pressable
              onPress={doApprove}
              disabled={approve.isPending}
              style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, approve.isPending && { opacity: 0.7 }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                <MaterialIcons name="check" size={24} color={colors.primaryContrast} />
                <Text style={styles.ctaText}>{approve.isPending ? 'Publication…' : 'Approuver et publier'}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.rejectButton, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => setRejecting(true)}>
              <MaterialIcons name="close" size={22} color={colors.dangerInk} />
              <Text style={styles.rejectText}>Refuser</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.rejectButton} onPress={goBack}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
            <Text style={[styles.rejectText, { color: colors.text }]}>Retour aux programmes</Text>
          </Pressable>
        )}
      </ScrollView>

      <BottomSheet visible={rejecting} onClose={() => setRejecting(false)}>
        <Text style={styles.sheetTitle}>Refuser « {program.name} » ?</Text>
        <Text style={styles.sheetText}>Le coach verra le motif et pourra dupliquer le programme pour le corriger.</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Motif du refus (facultatif)"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.noteInput}
        />
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Refuser le programme" onPress={doReject} variant="secondary" loading={reject.isPending} />
          <Button label="Annuler" onPress={() => setRejecting(false)} variant="outline" />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    heroShadow: { borderRadius: 30, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8 },
    hero: { borderRadius: 30, padding: 22, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.24)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    heroTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    heroTitle: { fontFamily: fonts.head, fontSize: 28, lineHeight: 32, letterSpacing: -1, color: '#FFFFFF', marginTop: 14 },
    heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    heroChip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    heroChipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    rejection: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.dangerSoft, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
    rejectionText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.dangerInk },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    statValue: { fontFamily: fonts.head, fontSize: 22, lineHeight: 26, letterSpacing: -0.8, color: colors.text },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginTop: 2 },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    exerciseCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    indexBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    indexBadgeText: { fontFamily: fonts.head, fontSize: 14, color: colors.primaryInk },
    exerciseName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, textTransform: 'capitalize' },
    exerciseMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    exerciseSets: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    rejectButton: {
      minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    rejectText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.dangerInk },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
    noteInput: {
      minHeight: 90, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, padding: 14,
      fontFamily: fonts.body, fontSize: 15, color: colors.text, textAlignVertical: 'top', marginTop: spacing.sm,
    },
  });
}
