import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useProgramDetail } from '../../../src/hooks/useCoachSessions';
import { useDeleteOwnProgram } from '../../../src/hooks/useCoaching';
import { Button } from '../../../src/components/Button';
import { BottomSheet, EmptyState, OfflineBanner, Toast } from '../../../src/components/ui';
import { muscleGroupLabel } from '../../../src/constants/muscleGroups';
import { useNetworkStatusContext } from '../../../src/hooks/NetworkStatusContext';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useTranslation } from 'react-i18next';
import { WEEKDAYS_LONG_SUN } from '../../../src/i18n/labels';

const DAY_LABELS = WEEKDAYS_LONG_SUN;

/** Détail du programme — FitZone App Entraînement.dc.html, D2. */
export default function ProgramDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: program, isLoading, isError, refetch } = useProgramDetail(id);
  const deleteProgram = useDeleteOwnProgram();
  const { isOnline, lastSyncAt } = useNetworkStatusContext();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
      {!isOnline ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <OfflineBanner lastSyncAt={lastSyncAt} />
        </View>
      ) : null}
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

        <View style={styles.statsRow}>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statValue}>{day?.exercises.length ?? 0}</Text>
            <Text style={styles.statLabel}>{t('common.exercices')}</Text>
          </View>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>{t('common.series')}</Text>
          </View>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statValue}>{t('member.min', { estimatedMinutes })}</Text>
            <Text style={styles.statLabel}>{t('common.duree')}</Text>
          </View>
        </View>

        {muscles.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{t('common.muscles_cibles')}</Text>
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
          <Text style={styles.sectionTitle}>{t('common.exercices')}</Text>
          <View style={{ gap: 10 }}>
            {day?.exercises.map((ex, i) => {
              const firstSet = ex.setDetails[0];
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
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexBadgeText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.exerciseName} numberOfLines={2}>{ex.exercise.name}</Text>
                    {ex.exercise.muscleGroup ? (
                      <Text style={styles.exerciseMeta} numberOfLines={1}>{muscleGroupLabel(ex.exercise.muscleGroup)}</Text>
                    ) : null}
                  </View>
                  <View style={styles.exerciseRight}>
                    <Text style={styles.exerciseSets}>{ex.sets} × {ex.reps}</Text>
                    <Text style={styles.exerciseMeta}>{firstSet?.weightKg ? `${Number(firstSet.weightKg)} kg` : t('common.poids_du_corps')}</Text>
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
        <Pressable
          style={styles.menuItem}
          onPress={() => {
            setMenuOpen(false);
            router.push({ pathname: '/(member)/program-builder', params: { programId: program.id } });
          }}
        >
          <MaterialIcons name="edit" size={20} color={colors.text} />
          <Text style={styles.menuItemText}>{t('member.modifier_le_programme')}</Text>
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => {
            setMenuOpen(false);
            setConfirmDelete(true);
          }}
        >
          <MaterialIcons name="delete-outline" size={20} color={colors.dangerInk} />
          <Text style={[styles.menuItemText, { color: colors.dangerInk }]}>{t('member.supprimer_le_programme')}</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text style={styles.sheetTitle}>{t('common.supprimer_2', { name: program.name })}</Text>
        <Text style={styles.sheetText}>{t('member.cette_action_est_definitive_et')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('member.supprimer')} onPress={handleDelete} variant="secondary" loading={deleteProgram.isPending} />
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
      width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    heroShadow: {
      borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
    },
    hero: { borderRadius: radii.xl, padding: 22, gap: 8, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    heroTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    heroTitle: { fontFamily: fonts.head, fontSize: 28, lineHeight: 32, letterSpacing: -1, color: '#FFFFFF' },
    heroSub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.92)' },
    dayTabs: { gap: 8 },
    dayTab: {
      height: 36, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    dayTabText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    dayTabTextActive: { color: colors.primaryContrast },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1, padding: 14, gap: 2, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    statValue: { fontFamily: fonts.head, fontSize: 24, lineHeight: 28, letterSpacing: -0.8, color: colors.text },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    muscleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft },
    muscleChipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    exerciseCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    indexBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    indexBadgeText: { fontFamily: fonts.head, fontSize: 14, color: colors.primaryInk },
    exerciseName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, textTransform: 'capitalize' },
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
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 50, paddingHorizontal: spacing.xs },
    menuItemText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  });
}
