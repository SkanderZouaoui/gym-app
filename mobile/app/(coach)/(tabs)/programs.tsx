import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachPrograms, type ProgramStatus } from '../../../src/hooks/useCoachSessions';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { ScreenTitle, SkeletonList } from '../../../src/components/ui';
import { PROGRAM_STATUS_LABEL } from '../../../src/components/coach/programStatus';
import { useTranslation } from 'react-i18next';
import i18n from '../../../src/i18n';
import { HScroll } from '../../../src/components/ui/HScroll';

type Filter = 'all' | ProgramStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', get label() { return i18n.t('common.tous'); } },
  { value: 'APPROVED', get label() { return i18n.t('coach.valides'); } },
  { value: 'PENDING', get label() { return i18n.t('common.en_validation'); } },
  { value: 'REJECTED', get label() { return i18n.t('common.refuses'); } },
];

/** Programmes du coach : statistiques de validation, filtres, liste, création. */
export default function CoachProgramsScreen() {
  const { t } = useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: programs, refetch, isLoading } = useCoachPrograms();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const [filter, setFilter] = useState<Filter>('all');

  const list = programs ?? [];
  const count = (s: ProgramStatus) => list.filter((p) => p.status === s).length;
  const shown = list.filter((p) => filter === 'all' || p.status === filter);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenTitle
          title={t('common.programmes')}
          subtitle={t('coach.soumis_a_validation_de_ladmin')}
          right={
            <Pressable
              accessibilityLabel={t('common.creer_un_programme')}
              onPress={() => router.push('/(coach)/program-new')}
              style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                <MaterialIcons name="add" size={28} color={colors.primaryContrast} />
              </LinearGradient>
            </Pressable>
          }
        />

        <View style={styles.statsRow}>
          {[
            { n: count('APPROVED'), l: t('coach.valides'), color: colors.text },
            { n: count('PENDING'), l: t('coach.en_attente'), color: colors.warningInk },
            { n: count('REJECTED'), l: t('common.refuses'), color: colors.dangerInk },
          ].map((s) => (
            <View key={s.l} style={[styles.statCard, cardShadow]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        <HScroll contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <Pressable key={f.value} onPress={() => setFilter(f.value)} style={styles.filterPill}>
                {active ? (
                  <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                ) : null}
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </HScroll>

        <View style={{ gap: 10 }}>
          {shown.map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push(`/(coach)/program/${p.id}`)}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardIcon}>
                <MaterialIcons name="fitness-center" size={26} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.cardMeta}>{[p.level, p.goal].filter(Boolean).join(' · ') || (p.isPublic ? t('coach.tous_les_adherents') : `${p.assignedTo.firstName} ${p.assignedTo.lastName}`)}</Text>
                <View style={[styles.badge, p.status === 'PENDING' && styles.badgePending, p.status === 'REJECTED' && styles.badgeRejected, p.status === 'APPROVED' && styles.badgeApproved]}>
                  <Text
                    style={[
                      styles.badgeText,
                      p.status === 'PENDING' && { color: colors.warningInk },
                      p.status === 'REJECTED' && { color: colors.dangerInk },
                      p.status === 'APPROVED' && { color: colors.successInk },
                    ]}
                  >
                    {p.status === 'PENDING' ? PROGRAM_STATUS_LABEL.PENDING.toUpperCase() : PROGRAM_STATUS_LABEL[p.status]}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          ))}
          {isLoading ? <SkeletonList count={3} height={96} /> : shown.length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <Text style={styles.emptyText}>{t('coach.aucun_programme_dans_cette_categorie')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    addShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 6,
    },
    addButton: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    statValue: { fontFamily: fonts.head, fontSize: 26, lineHeight: 30, letterSpacing: -0.8 },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginTop: 2 },
    filters: { gap: 8 },
    filterPill: {
      height: 36, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    filterText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    filterTextActive: { color: colors.primaryContrast },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    cardIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    cardName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    cardMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
    badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
    badgeApproved: { backgroundColor: colors.successSoft },
    badgePending: { backgroundColor: colors.warningSoft },
    badgeRejected: { backgroundColor: colors.dangerSoft },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.4 },
    empty: { padding: 28, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  });
}
