import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useProgramDetail } from '../../../src/hooks/useCoachSessions';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { EmptyState } from '../../../src/components/ui';
import { muscleGroupLabel } from '../../../src/constants/muscleGroups';
import { PROGRAM_STATUS_LABEL, estimateMinutes } from '../../../src/components/coach/programStatus';
import { useTranslation } from 'react-i18next';
import { goalLabel, levelLabel } from '../../../src/i18n/labels';

/** Détail d'un programme du coach : statut de validation, motif de refus, chiffres clés, exercices. */
export default function CoachProgramDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: program, isLoading, isError, refetch } = useProgramDetail(id);
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(coach)/(tabs)/programs'));

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
          <EmptyState
            icon="cloud-off"
            title={t('common.programme_indisponible')}
            text={isError ? t('coach.impossible_de_recuperer_ce_programme') : t('common.ce_programme_est_introuvable')}
            tone="danger"
            actionLabel={t('common.retour')}
            onAction={goBack}
          />
        </View>
      </SafeAreaView>
    );
  }

  const status = program.status ?? 'APPROVED';
  const exercises = program.days.flatMap((d) => d.exercises);
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.programmes')}</Text>
        </Pressable>

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>{PROGRAM_STATUS_LABEL[status]}</Text>
            </View>
            <Text style={styles.heroTitle}>{program.name}</Text>
          </LinearGradient>
        </View>

        {status === 'REJECTED' && program.rejectionNote ? (
          <View style={styles.rejection}>
            <MaterialIcons name="feedback" size={22} color={colors.dangerInk} />
            <Text style={styles.rejectionText}>
              <Text style={{ fontFamily: fonts.bodyBold }}>{t('common.motif_du_refus')}</Text>
              {program.rejectionNote}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          {[
            { icon: 'signal-cellular-alt' as const, label: t('common.niveau'), value: program.level ? levelLabel(program.level) : '—' },
            { icon: 'flag' as const, label: t('common.objectif'), value: program.goal ? goalLabel(program.goal) : '—' },
          ].map((c) => (
            <View key={c.label} style={[styles.infoCard, cardShadow]}>
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.infoIcon}>
                <MaterialIcons name={c.icon} size={24} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ minWidth: 0, flex: 1 }}>
                <Text style={styles.infoLabel}>{c.label.toUpperCase()}</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{c.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          {[
            { n: String(exercises.length), l: t('common.exercices') },
            { n: String(totalSets), l: t('common.series') },
            { n: `~${estimateMinutes(totalSets)} min`, l: t('common.duree') },
          ].map((s) => (
            <View key={s.l} style={[styles.statCard, cardShadow]}>
              <Text style={styles.statValue}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        <View>
          <Text style={styles.sectionTitle}>{t('common.exercices')}</Text>
          <View style={{ gap: 10 }}>
            {exercises.map((ex, i) => {
              const weight = ex.setDetails[0]?.weightKg;
              return (
                <View key={ex.id} style={[styles.exerciseCard, cardShadow]}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexBadgeText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.exerciseName} numberOfLines={2}>{ex.exercise.name}</Text>
                    {ex.exercise.muscleGroup ? <Text style={styles.exerciseMeta}>{muscleGroupLabel(ex.exercise.muscleGroup)}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.exerciseSets}>{ex.sets} × {ex.reps}</Text>
                    <Text style={styles.exerciseMeta}>{weight ? `${Number(weight)} kg` : t('common.poids_du_corps')}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => router.push({ pathname: '/(coach)/program-new', params: { duplicateFrom: program.id } })}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="content-copy" size={22} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{t('coach.dupliquer_comme_nouveau_programme')}</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    heroShadow: {
      borderRadius: 30, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
    },
    hero: { borderRadius: 30, padding: 22, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.24)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    heroTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    heroTitle: { fontFamily: fonts.head, fontSize: 30, lineHeight: 34, letterSpacing: -1, color: '#FFFFFF', marginTop: 14 },
    rejection: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.dangerSoft, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
    rejectionText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.dangerInk },
    infoRow: { flexDirection: 'row', gap: 10 },
    infoCard: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    infoIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    infoLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.muted },
    infoValue: { fontFamily: fonts.head, fontSize: 15, letterSpacing: -0.3, color: colors.text },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    statValue: { fontFamily: fonts.head, fontSize: 22, lineHeight: 26, letterSpacing: -0.8, color: colors.text },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginTop: 2 },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10 },
    exerciseCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    indexBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    indexBadgeText: { fontFamily: fonts.head, fontSize: 14, color: colors.primaryInk },
    exerciseName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, textTransform: 'capitalize' },
    exerciseMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    exerciseSets: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
    ctaShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 6,
    },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
