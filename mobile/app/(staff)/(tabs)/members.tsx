import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useStaffRoutes } from '../../../src/navigation/staffRoutes';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMembers } from '../../../src/hooks/useStaff';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { FilterDropdown, ScreenTitle, SkeletonList } from '../../../src/components/ui';
import { InitialsAvatar, StatusTag, membershipBadge } from '../../../src/components/staff/staffUi';
import type { MemberSearchResult } from '../../../src/hooks/useStaff';
import { useTranslation } from 'react-i18next';
import i18n from '../../../src/i18n';
import { useNow } from '../../../src/hooks/useNow';

type StatusFilter = 'all' | 'active' | 'expiring' | 'expired' | 'none';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', get label() { return i18n.t('common.tous'); } },
  { value: 'active', get label() { return i18n.t('staff.actifs'); } },
  { value: 'expiring', get label() { return i18n.t('staff.expirent_bientot'); } },
  { value: 'expired', get label() { return i18n.t('staff.expires'); } },
  { value: 'none', get label() { return i18n.t('staff.sans_abonnement'); } },
];

/** Statut d'abonnement d'un adhérent à partir de son dernier abonnement. */
function membershipState(m: MemberSearchResult): StatusFilter {
  const last = m.memberships?.[0];
  if (!last) return 'none';
  if (last.status === 'ACTIVE') {
    const daysLeft = (new Date(last.endDate).getTime() - Date.now()) / 86_400_000;
    return daysLeft <= 14 ? 'expiring' : 'active';
  }
  return last.status === 'EXPIRED' ? 'expired' : 'none';
}

/** Adhérents (accueil) : recherche, liste, ouverture de la fiche, création de compte. */
export default function StaffMembersScreen() {
  const nowMs = useNow();
  const { t } = useTranslation();
  const routes = useStaffRoutes();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const { status: initialStatus } = useLocalSearchParams<{ status?: StatusFilter }>();
  const [status, setStatus] = useState<StatusFilter>('all');
  // Arrivée avec un filtre (carte « Adhérents actifs », « Voir tout »…) : on l'applique puis on retire le
  // paramètre de la route, pour qu'il ne reste pas collé à l'onglet.
  useEffect(() => {
    if (!initialStatus) return;
    setStatus(initialStatus);
    router.setParams({ status: undefined });
  }, [initialStatus]);
  const [plan, setPlan] = useState<string | null>(null);
  // En quittant l'écran, tous les filtres et la recherche sont réinitialisés.
  useFocusEffect(
    useCallback(
      () => () => {
        setStatus('all');
        setPlan(null);
        setQuery('');
      },
      [],
    ),
  );
  const { data: members, refetch, isLoading } = useMembers(query.trim());
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);

  const plans = useMemo(
    () => Array.from(new Set((members ?? []).map((m) => m.memberships?.[0]?.plan.name).filter((p): p is string => !!p))).sort(),
    [members],
  );
  const activePlan = plan && plans.includes(plan) ? plan : null;
  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, active: 0, expiring: 0, expired: 0, none: 0 };
    for (const m of members ?? []) {
      c.all++;
      c[membershipState(m)]++;
    }
    return c;
  }, [members]);
  const filtered = (members ?? []).filter(
    (m) => (status === 'all' || membershipState(m) === status) && (!activePlan || m.memberships?.[0]?.plan.name === activePlan),
  );

  const sections = useMemo(() => {
    const groups = new Map<string, MemberSearchResult[]>();
    for (const m of filtered) {
      const letter = (m.firstName[0] ?? '#').toUpperCase();
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)!.push(m);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([title, data]) => ({ title, data }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, status, activePlan]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <ScreenTitle
          title={t('common.adherents')}
          subtitle={t('staff.rechercher_consulter_creer_un_compte')}
          right={
            <Pressable
              accessibilityLabel={t('common.creer_un_compte')}
              onPress={() => router.push(routes.memberCreate)}
              style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                <MaterialIcons name="person-add" size={24} color={colors.primaryContrast} />
              </LinearGradient>
            </Pressable>
          }
        />
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={24} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('staff.rechercher_un_adherent')}
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.filterRow}>
          <FilterDropdown
            title={t('staff.statut')}
            icon="verified-user"
            value={status}
            options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label, count: counts[f.value] }))}
            onChange={setStatus}
          />
          {plans.length > 1 ? (
            <FilterDropdown<string | null>
              title={t('staff.formule')}
              icon="card-membership"
              value={activePlan}
              options={[{ value: null, label: t('staff.toutes_les_formules') }, ...plans.map((p) => ({ value: p, label: p }))]}
              onChange={setPlan}
            />
          ) : null}
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultText}>{t('staff.adherent', { length: filtered.length, v3: filtered.length > 1 ? 's' : '' })}</Text>
          {status !== 'all' || activePlan ? (
            <Pressable
              onPress={() => {
                setStatus('all');
                setPlan(null);
              }}
              hitSlop={8}
              style={styles.reset}
            >
              <MaterialIcons name="close" size={16} color={colors.primaryInk} />
              <Text style={styles.resetText}>{t('staff.reinitialiser')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <SectionList
        {...tabBarScroll}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLetter}>{section.title}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const badge = badgeFor(item);
          const last = item.memberships?.[0];
          const daysLeft = last?.status === 'ACTIVE' ? Math.max(0, Math.ceil((new Date(last.endDate).getTime() - nowMs) / 86_400_000)) : null;
          const ring = badge.tone === 'success' ? colors.success : badge.tone === 'warning' ? colors.warning : badge.tone === 'danger' ? colors.danger : colors.border;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push(routes.member(item.id))}
            >
              <View style={[styles.ring, { borderColor: ring }]}>
                <InitialsAvatar first={item.firstName} last={item.lastName} size={42} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={styles.name} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.plan} numberOfLines={1}>{last?.plan.name ?? t('common.aucun_abonnement')}</Text>
                <View style={styles.contactRow}>
                  <MaterialIcons name={item.phone ? 'call' : 'mail-outline'} size={13} color={colors.muted} />
                  <Text style={styles.meta} numberOfLines={1}>{item.phone ?? item.email ?? '—'}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <StatusTag {...badge} />
                {daysLeft !== null ? <Text style={styles.daysLeft}>{t('staff.j_restants', { daysLeft })}</Text> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={isLoading ? <SkeletonList count={6} /> : (<View style={[styles.empty, cardShadow]}>
            <MaterialIcons name="person-search" size={34} color={colors.primaryInk} />
            <Text style={styles.emptyText}>{t('staff.aucun_adherent_ne_correspond_a')}</Text>
          </View>)}
      />
    </SafeAreaView>
  );
}

function badgeFor(m: MemberSearchResult) {
  const last = m.memberships?.[0];
  const daysLeft = last ? Math.ceil((new Date(last.endDate).getTime() - Date.now()) / 86_400_000) : null;
  return membershipBadge(last?.status, daysLeft);
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: spacing.sm },
    addShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 6,
    },
    addButton: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 16, paddingHorizontal: 14,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, height: 52 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
    resultText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
    reset: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft },
    resetText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
    list: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
    sectionHeader: { backgroundColor: colors.bg, paddingTop: 12, paddingBottom: 8 },
    sectionLetter: { fontFamily: fonts.head, fontSize: 15, letterSpacing: 0.5, color: colors.primaryInk },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    ring: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    plan: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primaryInk },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, flexShrink: 1 },
    daysLeft: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
    empty: { padding: 28, alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  });
}
