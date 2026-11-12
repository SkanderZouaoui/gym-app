import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useProgramDetail } from '../../../src/hooks/useCoachSessions';
import { useDeleteOwnProgram } from '../../../src/hooks/useCoaching';
import { Button } from '../../../src/components/Button';
import { BottomSheet, EmptyState, Toast, DetailSkeleton } from '../../../src/components/ui';
import { muscleGroupLabel } from '../../../src/constants/muscleGroups';
import { summarizeExercise, useLastSessionValues } from '../../../src/hooks/useLastSessionValues';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useTranslation } from 'react-i18next';
import { WEEKDAYS_LONG_SUN } from '../../../src/i18n/labels';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { ExerciseGif } from '../../../src/components/training/ExerciseGif';

const DAY_LABELS = WEEKDAYS_LONG_SUN;

/** Détail du programme — FitZone App Entraînement.dc.html, D2. */
export default function ProgramDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: program, isLoading, isError, refetch } = useProgramDetail(id);
  const deleteProgram = useDeleteOwnProgram();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Séries et répétitions réelles (dernière séance enregistrée), pas seulement les valeurs globales du programme.
  const lastSession = useLastSessionValues(program?.days[activeDayIndex]?.exercises.map((e) => e.exercise.id) ?? []);

  if (isLoading && !program) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="" fallbackHref="/(member)/(tabs)/training" />
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            icon="cloud-off"
            title={t('common.programme_indisponible')}
            text={isError ? t('member.impossible_de_recuperer_ce_programme') : t('common.ce_programme_est_introuvable')}
            tone="danger"
            actionLabel={isError ? t('common.reessayer') : undefined}
            onAction={isError ? () => refetch() : undefined}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isOwn = program.createdById === program.assignedToId;
  const day = program.days[activeDayIndex];

  const handleDelete = () => {
    deleteProgram.mutate(program.id, { onSuccess: () => router.replace('/(member)/(tabs)/training') });
  };

  const estimatedMinutes = day
    ? Math.round(
        day.exercises.reduce((total, ex) => total + ex.sets * (45 + (ex.restSeconds ?? 60)), 0) / 60,
      )
    : 0;
  const totalSets = day?.exercises.reduce((sum, ex) => sum + ex.sets, 0) ?? 0;
  const muscles = Array.from(
    new Set((day?.exercises ?? []).map((ex) => ex.exercise.muscleGroup).filter((g): g is string => !!g)),
  ).map(muscleGroupLabel);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/training'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
            <Text style={styles.backText}>{t('common.programmes')}</Text>
          </Pressable>
          {isOwn ? (
            <Pressable style={styles.headerActionButton} onPress={() => setMenuOpen(true)} hitSlop={8}>
              <MaterialIcons name="more-vert" size={20} color={colors.text} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>{isOwn ? t('member.perso') : program.isPublic ? t('member.propose') : t('common.coach')}</Text>
            </View>
            <Text style={styles.heroTitle}>{program.name}</Text>
            <Text style={styles.heroSub}>{t('member.seance_par_semaine', { length: program.days.length, v3: program.days.length > 1 ? 's' : '', v5: day ? ` · ${day.label ?? DAY_LABELS[day.dayOfWeek]}` : '' })}</Text>
          </LinearGradient>
        </View>

        {program.days.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
            {program.days.map((d, i) => (
              <Pressable key={d.id} onPress={() => setActiveDayIndex(i)} style={styles.dayTab}>
                {i === activeDayIndex ? (
                  <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                ) : null}
                <Text style={[styles.dayTabText, i === activeDayIndex && styles.dayTabTextActive]}>
                  {d.label ?? DAY_LABELS[d.dayOfWeek]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.statsCard, cardShadow]}>
          {[
            { value: String(day?.exercises.length ?? 0), unit: '', label: t('common.exercices') },
            { value: String(totalSets), unit: '', label: t('common.series') },
            { value: String(estimatedMinutes), unit: t('member.min', { estimatedMinutes: '' }).trim(), label: t('common.duree') },
          ].map((st, i) => (
            <View key={st.label} style={[styles.statCol, i > 0 && styles.statColDivider]}>
              <Text style={styles.statLabel} numberOfLines={1}>{st.label}</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {st.value}
                {st.unit ? <Text style={styles.statUnit}> {st.unit}</Text> : null}
              </Text>
            </View>
          ))}
        </View>

        {muscles.length > 0 ? (
          <View>
            <SectionHeader title={t('common.muscles_cibles')} style={{ marginBottom: 10 }} />
            <View style={styles.chipsRow}>
              {muscles.map((m) => (
                <View key={m} style={styles.muscleChip}>
                  <Text style={styles.muscleChipText}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <SectionHeader title={t('common.exercices')} style={{ marginBottom: 10 }} />
          <View style={{ gap: 10 }}>
            {day?.exercises.map((ex, i) => {
              const summary = summarizeExercise(ex, lastSession.get(ex.exercise.id));
              return (
                <Pressable
                  key={ex.id}
                  style={({ pressed }) => [styles.exerciseCard, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(member)/exercises/view',
                      params: { exerciseId: ex.exercise.id, sets: String(ex.sets), reps: ex.reps, setDetails: JSON.stringify(ex.setDetails), programId: program.id },
                    })
                  }
                >
                  <View style={styles.thumb}>
                    <ExerciseGif uri={ex.exercise.mediaKey} size={60} />
                    <View style={styles.indexBadge}>
                      <Text style={styles.indexBadgeText}>{i + 1}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.exerciseName} numberOfLines={2}>{ex.exercise.name}</Text>
                    {ex.exercise.muscleGroup ? (
                      <Text style={styles.exerciseMeta} numberOfLines={1}>{muscleGroupLabel(ex.exercise.muscleGroup)}</Text>
                    ) : null}
                  </View>
                  <View style={styles.exerciseRight}>
                    <Text style={styles.exerciseSets}>{summary.count} × {summary.repsLabel}</Text>
                    <Text style={styles.exerciseMeta}>{summary.weightLabel ? `${summary.weightLabel} kg` : t('common.poids_du_corps')}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => day && router.push(`/(member)/session/live/${program.id}/${day.id}`)}
          style={({ pressed }) => [styles.startShadow, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.startButton}>
            <MaterialIcons name="play-arrow" size={24} color={colors.primaryContrast} />
            <Text style={styles.startButtonText}>{t('member.demarrer_la_seance')}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <View style={styles.menuList}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
            onPress={() => {
              setMenuOpen(false);
              router.push({ pathname: '/(member)/program-builder', params: { programId: program.id } });
            }}
          >
            <MaterialIcons name="edit" size={22} color={colors.text} />
            <Text style={styles.menuItemText}>{t('member.modifier_le_programme')}</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
            onPress={() => {
              setMenuOpen(false);
              setConfirmDelete(true);
            }}
          >
            <MaterialIcons name="delete-outline" size={22} color={colors.dangerInk} />
            <Text style={[styles.menuItemText, { color: colors.dangerInk }]}>{t('member.supprimer_le_programme')}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <View style={styles.confirmIcon}>
          <MaterialIcons name="delete-outline" size={30} color={colors.dangerInk} />
        </View>
        <Text style={styles.sheetTitle}>{t('common.supprimer_2', { name: program.name })}</Text>
        <Text style={styles.sheetText}>{t('member.cette_action_est_definitive_et')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button label={t('member.supprimer')} onPress={handleDelete} variant="danger" loading={deleteProgram.isPending} />
          <Button label={t('common.annuler')} onPress={() => setConfirmDelete(false)} variant="outline" />
        </View>
      </BottomSheet>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    headerActionButton: {
      width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    heroShadow: {
      borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
    },
    hero: { borderRadius: radii.xl, padding: 22, gap: 8, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    heroTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    heroTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, textTransform: 'uppercase', color: '#FFFFFF' },
    heroSub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.92)' },
    dayTabs: { gap: 8 },
    dayTab: {
      height: 36, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    dayTabText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    dayTabTextActive: { color: colors.primaryContrast },
    statsRow: { flexDirection: 'row', gap: 10 },
    statsCard: {
      flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: 16,
    },
    statCol: { flex: 1, minWidth: 0, paddingHorizontal: 16, gap: 6 },
    statColDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.borderStrong },
    statLabel: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.3, textTransform: 'uppercase', color: colors.muted },
    statValue: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -1, color: colors.text },
    statUnit: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0, color: colors.muted },
    sectionTitle: { fontFamily: fonts.headBold, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    muscleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft },
    muscleChipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    exerciseCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    thumb: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
    indexBadge: { position: 'absolute', top: -6, left: -6, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: colors.deep, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    indexBadgeText: { fontFamily: fonts.head, fontSize: 11, color: '#FFFFFF' },
    exerciseName: { fontFamily: fonts.headBold, fontSize: 15.5, letterSpacing: -0.2, color: colors.text, textTransform: 'capitalize' },
    exerciseMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    exerciseRight: { alignItems: 'flex-end' },
    exerciseSets: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
    startShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    startButton: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    startButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    sheetTitle: { fontFamily: fonts.headBold, fontSize: 19, letterSpacing: -0.3, color: colors.text, textAlign: 'center' },
    sheetText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, lineHeight: 20, textAlign: 'center', marginTop: 6 },
    confirmIcon: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft, marginBottom: 14 },
    menuList: { marginTop: 4, marginBottom: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 58, paddingHorizontal: 4 },
    menuItemText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginLeft: 38 },
  });
}
