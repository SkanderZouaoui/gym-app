import { useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe } from '../../../src/hooks/useMe';
import { useAdminDashboard, useDailyAttendance, useExpiringMemberships, useReviewPrograms, useSetupAlerts } from '../../../src/hooks/useAdmin';
import { useOpenReports } from '../../../src/hooks/useModeration';
import { usePayments } from '../../../src/hooks/usePayments';
import { useStaffToday } from '../../../src/hooks/useStaff';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { OfflineBanner, SkeletonBlock } from '../../../src/components/ui';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../../src/i18n';
import { WEEKDAYS_NARROW_SUN } from '../../../src/i18n/labels';

const nf = (n: number) => n.toLocaleString(dateLocale());
const money = (n: number | string) => `${nf(Math.round(Number(n)))} DT`;
const DAY_LETTERS = WEEKDAYS_NARROW_SUN;

/** Pilotage (admin) : encaissé du mois, indicateurs clés, remplissage et alertes — FitZone Mobile Admin v2. */
export default function AdminDashboardScreen() {
  useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const { data, isLoading, refetch } = useAdminDashboard();
  const { data: daily, refetch: refetchDaily } = useDailyAttendance();
  const { data: expiring } = useExpiringMemberships();
  const { data: reports } = useOpenReports();
  const { data: setupAlerts, refetch: refetchSetup } = useSetupAlerts();
  // Revenir sur l'accueil après avoir corrigé une configuration met la liste à jour.
  useFocusEffect(useCallback(() => { void refetchSetup(); }, [refetchSetup]));
  const { data: payments } = usePayments();
  const { data: staffToday } = useStaffToday();
  const { isOnline, lastSyncAt } = useNetworkStatus();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetch(), refetchDaily()]));

  const now = new Date();
  const monthName = now.toLocaleDateString(dateLocale(), { month: 'long' });
  const dateLabel = now.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'AD';

  // Courbe : encaissements cumulés par semaine du mois en cours ; variation vs mois précédent.
  const { points, variation, prevMonthName } = useMemo(() => {
    const list = payments ?? [];
    const thisMonth = list.filter((p) => {
      const d = new Date(p.recordedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevTotal = list
      .filter((p) => {
        const d = new Date(p.recordedAt);
        return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
      })
      .reduce((s, p) => s + Number(p.amount), 0);
    const total = thisMonth.reduce((s, p) => s + Number(p.amount), 0);
    const buckets = [0, 0, 0, 0, 0];
    for (const p of thisMonth) buckets[Math.min(4, Math.floor((new Date(p.recordedAt).getDate() - 1) / 7))] += Number(p.amount);
    let acc = 0;
    const cumulative = buckets.map((b) => (acc += b));
    const max = Math.max(...cumulative, 1);
    const pts = cumulative.map((v, i) => `${(i / 4) * 300},${52 - (v / max) * 44}`).join(' ');
    return {
      points: total > 0 ? pts : '0,48 75,40 150,34 225,24 300,12',
      variation: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null,
      prevMonthName: prev.toLocaleDateString(dateLocale(), { month: 'long' }),
    };
  }, [payments]);

  const alerts = [
    staffToday && staffToday.sessions.some((s) => s.fillRate < 30)
      ? { icon: 'trending-down' as const, tone: 'danger' as const, title: i18n.t('admin.cours_sous_rempli'), sub: i18n.t('admin.remplissage_inferieur_a_30'), onPress: () => router.push('/(admin)/(tabs)/planning') }
      : null,
    expiring && expiring.length > 0
      ? {
          icon: 'schedule' as const,
          tone: 'warning' as const,
          title: i18n.t('admin.abonnement_expirent_sous_7_jours', { length: expiring.length, v1: expiring.length > 1 ? 's' : '' }),
          sub: expiring.slice(0, 2).map((m) => `${m.user.firstName} ${m.user.lastName}`).join(', '),
          onPress: () => router.push('/(admin)/(tabs)/members'),
        }
      : null,
    reports && reports.length > 0
      ? { icon: 'shield' as const, tone: 'info' as const, title: i18n.t('admin.signalement_a_moderer', { length: reports.length, v1: reports.length > 1 ? 's' : '' }), sub: i18n.t('admin.communaute'), onPress: () => router.push('/(admin)/(tabs)/more') }
      : null,
  ].filter((a): a is NonNullable<typeof a> => a !== null);

  const tone = {
    danger: { bg: colors.dangerSoft, fg: colors.dangerInk },
    warning: { bg: colors.warningSoft, fg: colors.warningInk },
    info: { bg: colors.infoSoft, fg: colors.infoInk },
  } as const;

  const { data: reviewPrograms } = useReviewPrograms();
  const pendingPrograms = (reviewPrograms ?? []).filter((p) => p.status === 'PENDING').length;
  const shortcuts: { key: string; icon: keyof typeof MaterialIcons.glyphMap; label: string; route: string; badge?: number }[] = [
    { key: 'cash', icon: 'point-of-sale', label: i18n.t('admin.shortcut_cash'), route: '/(admin)/cash-select' },
    { key: 'member', icon: 'person-add', label: i18n.t('admin.shortcut_member'), route: '/(admin)/member-create' },
    { key: 'class', icon: 'add-circle-outline', label: i18n.t('admin.shortcut_class'), route: '/(admin)/course-form' },
    { key: 'announce', icon: 'campaign', label: i18n.t('admin.shortcut_announce'), route: '/(admin)/announcements' },
    { key: 'programs', icon: 'fitness-center', label: i18n.t('admin.shortcut_programs'), route: '/(admin)/programs', badge: pendingPrograms || undefined },
    { key: 'scan', icon: 'qr-code-scanner', label: i18n.t('common.scanner'), route: '/(admin)/(tabs)/scanner' },
  ];

  const setupTone = {
    danger: { bg: colors.dangerSoft, fg: colors.dangerInk, icon: 'error-outline' as const },
    warning: { bg: colors.warningSoft, fg: colors.warningInk, icon: 'warning-amber' as const },
    info: { bg: colors.infoSoft, fg: colors.infoInk, icon: 'info-outline' as const },
  } as const;

  const days = daily?.days ?? [];
  const maxCount = Math.max(...days.map((d) => d.count), 1);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <SkeletonBlock height={44} width="60%" radius={radii.sm} />
          <SkeletonBlock height={190} radius={radii.xl} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SkeletonBlock height={110} width="48%" radius={radii.lg} />
            <SkeletonBlock height={110} width="48%" radius={radii.lg} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</Text>
            <Text style={styles.title}>{i18n.t('admin.pilotage')}</Text>
          </View>
          <Pressable onPress={() => router.push('/(admin)/profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        {!isOnline ? <OfflineBanner lastSyncAt={lastSyncAt} /> : null}

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <Text style={styles.heroKicker}>{i18n.t('admin.encaisse_en', { v1: monthName.toUpperCase() })}</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{money(data?.revenueMonth ?? 0)}</Text>
            {variation !== null ? (
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{i18n.t('admin.vs', { v0: variation >= 0 ? '+' : '', variation, prevMonthName })}</Text>
              </View>
            ) : null}
            <Svg viewBox="0 0 300 60" style={{ width: '100%', height: 60, marginTop: 14 }}>
              <Polyline points={points} fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx={300} cy={Number(points.split(' ').pop()?.split(',')[1] ?? 8)} r={5} fill="#FFFFFF" />
            </Svg>
          </LinearGradient>
        </View>

        <View style={styles.shortcutsHead}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.shortcuts')}</Text>
        </View>
        <View style={styles.shortcuts}>
          {shortcuts.map((sc) => (
            <Pressable
              key={sc.key}
              onPress={() => router.push(sc.route as never)}
              style={({ pressed }) => [styles.shortcut, cardShadow, pressed && { transform: [{ scale: 0.95 }] }]}
              accessibilityRole="button"
              accessibilityLabel={sc.label}
            >
              <View style={styles.shortcutIcon}>
                <MaterialIcons name={sc.icon} size={22} color={colors.primaryInk} />
                {sc.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{sc.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={2}>{sc.label}</Text>
            </Pressable>
          ))}
        </View>

        {setupAlerts && setupAlerts.length > 0 ? (
          <View style={{ gap: 8 }}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{i18n.t('admin.configuration_a_completer')}</Text>
              <Text style={styles.sectionCount}>{setupAlerts.length}</Text>
            </View>
            {setupAlerts.map((a) => {
              const t = setupTone[a.severity];
              return (
                <Pressable
                  key={a.key}
                  onPress={() => router.push(a.route as never)}
                  style={({ pressed }) => [styles.alert, cardShadow, { borderColor: t.fg + '40' }, pressed && { transform: [{ scale: 0.98 }] }]}
                >
                  <View style={[styles.alertIcon, { backgroundColor: t.bg }]}>
                    <MaterialIcons name={t.icon} size={22} color={t.fg} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.alertTitle} numberOfLines={2}>{i18n.t(`admin.setup_${a.key}_title`, { ...a.params, defaultValue: a.title })}</Text>
                    <Text style={styles.alertSub} numberOfLines={2}>{i18n.t(`admin.setup_${a.key}_detail`, { ...a.params, defaultValue: a.detail })}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.kpiRow}>
          <Pressable
            style={({ pressed }) => [styles.kpi, cardShadow, pressed && { transform: [{ scale: 0.97 }] }]}
            onPress={() => router.push({ pathname: '/(admin)/(tabs)/members', params: { status: 'active' } })}
            accessibilityRole="button"
          >
            <View style={styles.kpiTop}>
              <MaterialIcons name="group" size={22} color={colors.primary} />
              <MaterialIcons name="arrow-forward" size={18} color={colors.muted} />
            </View>
            <Text style={styles.kpiValue}>{nf(data?.activeMembers ?? 0)}</Text>
            <Text style={styles.kpiLabel}>{i18n.t('admin.adherents_actifs')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.kpi, cardShadow, pressed && { transform: [{ scale: 0.97 }] }]}
            onPress={() => router.push('/(admin)/(tabs)/planning')}
            accessibilityRole="button"
          >
            <View style={styles.kpiTop}>
              <MaterialIcons name="event" size={22} color={colors.primary} />
              <MaterialIcons name="arrow-forward" size={18} color={colors.muted} />
            </View>
            <Text style={styles.kpiValue}>{nf(data?.classesToday ?? 0)}</Text>
            <Text style={styles.kpiLabel}>{i18n.t('admin.cours_aujourdhui')}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.alertes')}</Text>
          <Text style={styles.sectionCount}>{alerts.length}</Text>
        </View>
        {alerts.length === 0 ? (
          <View style={[styles.alert, cardShadow]}>
            <View style={[styles.alertIcon, { backgroundColor: colors.successSoft }]}>
              <MaterialIcons name="check-circle" size={22} color={colors.successInk} />
            </View>
            <Text style={styles.alertTitle}>{i18n.t('admin.rien_a_signaler')}</Text>
          </View>
        ) : (
          alerts.map((a, i) => (
            <Pressable key={i} style={({ pressed }) => [styles.alert, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]} onPress={a.onPress}>
              <View style={[styles.alertIcon, { backgroundColor: tone[a.tone].bg }]}>
                <MaterialIcons name={a.icon} size={22} color={tone[a.tone].fg} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.alertTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.alertSub} numberOfLines={1}>{a.sub}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: 10, paddingBottom: 140 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6, paddingBottom: 4 },
    date: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    title: { fontFamily: fonts.head, fontSize: 26, letterSpacing: -0.7, color: colors.text },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    avatarText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    heroShadow: { borderRadius: 28, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8, marginTop: 4 },
    hero: { borderRadius: 28, padding: 22, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -50, top: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.1)' },
    heroKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.92)' },
    heroValue: { fontFamily: fonts.head, fontSize: 46, letterSpacing: -2, color: '#FFFFFF', marginTop: 6 },
    heroPill: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
    heroPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    kpiRow: { flexDirection: 'row', gap: 10 },
    kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    shortcutsHead: { marginTop: 6 },
    shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    shortcut: {
      width: '31.5%', paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 8, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    shortcutIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    shortcutLabel: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text, textAlign: 'center' },
    badge: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#FFFFFF' },
    kpi: { flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    kpiValue: { fontFamily: fonts.head, fontSize: 38, letterSpacing: -1.5, color: colors.text, marginTop: 8 },
    kpiLabel: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    fillCard: { padding: 16, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    fillValue: { fontFamily: fonts.head, fontSize: 52, letterSpacing: -2, color: colors.primary },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 74, marginTop: 8 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%' },
    bar: { width: '100%', borderRadius: 6 },
    barLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
    fillNote: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted, marginTop: 10 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text },
    sectionCount: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dangerInk },
    alert: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14,
      backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border,
    },
    alertIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    alertTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    alertSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  });
}
