import { useMemo, useState , useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { NotificationBell } from '../../../src/components/NotificationBell';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe } from '../../../src/hooks/useMe';
import { useAdminDashboard, useDailyAttendance, useExpiringMemberships, useReviewPrograms, useSetupAlerts, useTeamOnShift } from '../../../src/hooks/useAdmin';
import { useOpenReports } from '../../../src/hooks/useModeration';
import { usePayments } from '../../../src/hooks/usePayments';
import { useStaffToday } from '../../../src/hooks/useStaff';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { BottomSheet, OfflineBanner, ProgressBar, SkeletonBlock, SkeletonList } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import { DEFAULT_ADMIN_SHORTCUTS, usePreferencesStore } from '../../../src/store/preferences';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../../src/i18n';
import { useNow } from '../../../src/hooks/useNow';

const nf = (n: number) => n.toLocaleString(dateLocale());
const money = (n: number | string) => `${nf(Math.round(Number(n)))} DT`;

/** Pilotage (admin) : encaissé du mois, indicateurs clés, remplissage et alertes — FitZone Mobile Admin v2. */
export default function AdminDashboardScreen() {
  const nowMs = useNow();
  useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  // Deux raccourcis par ligne, sur toute la largeur utile (marges de page et espace entre cartes déduits).
  const shortcutWidth = (screenWidth - spacing.lg * 2 - 10) / 2;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const { data, isLoading, refetch } = useAdminDashboard();
  const { refetch: refetchDaily } = useDailyAttendance();
  const { data: expiring, isLoading: expiringLoading } = useExpiringMemberships();
  const { data: reports } = useOpenReports();
  const { data: setupAlerts, refetch: refetchSetup } = useSetupAlerts();
  // Revenir sur l'accueil après avoir corrigé une configuration met la liste à jour.
  useFocusEffect(useCallback(() => { void refetchSetup(); }, [refetchSetup]));
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: staffToday, isLoading: todayLoading } = useStaffToday();
  const { isOnline, lastSyncAt } = useNetworkStatus();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetch(), refetchDaily()]));

  const now = new Date();
  const monthName = now.toLocaleDateString(dateLocale(), { month: 'long' });
  const dateLabel = now.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'AD';

  // Courbe : encaissements cumulés par semaine du mois en cours ; variation vs mois précédent.
  const { points, variation, prevMonthName } = useMemo(() => {
    const now = new Date();
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
  const catalog: { key: string; icon: keyof typeof MaterialIcons.glyphMap; label: string; route: string; badge?: number }[] = [
    { key: 'cash', icon: 'point-of-sale', label: i18n.t('admin.shortcut_cash'), route: '/(admin)/cash-select' },
    { key: 'member', icon: 'person-add', label: i18n.t('admin.shortcut_member'), route: '/(admin)/member-create' },
    { key: 'class', icon: 'add-circle-outline', label: i18n.t('admin.shortcut_class'), route: '/(admin)/course-form' },
    { key: 'announce', icon: 'campaign', label: i18n.t('admin.shortcut_announce'), route: '/(admin)/announcements' },
    { key: 'programs', icon: 'fitness-center', label: i18n.t('admin.shortcut_programs'), route: '/(admin)/programs', badge: pendingPrograms || undefined },
    { key: 'scan', icon: 'qr-code-scanner', label: i18n.t('common.scanner'), route: '/(admin)/(tabs)/scanner' },
    { key: 'planning', icon: 'calendar-month', label: i18n.t('common.planning'), route: '/(admin)/(tabs)/planning' },
    { key: 'members', icon: 'groups', label: i18n.t('common.adherents'), route: '/(admin)/(tabs)/members' },
    { key: 'payments', icon: 'receipt-long', label: i18n.t('common.encaissements'), route: '/(admin)/cash' },
    { key: 'notifications', icon: 'notifications', label: i18n.t('common.notifications'), route: '/(admin)/notifications' },
    { key: 'alerts', icon: 'notification-important', label: i18n.t('admin.alertes_adherents'), route: '/(admin)/alerts' },
    { key: 'team', icon: 'badge', label: i18n.t('admin.equipe'), route: '/(admin)/team' },
    { key: 'plans', icon: 'card-membership', label: i18n.t('admin.abonnements'), route: '/(admin)/plans' },
    { key: 'settings', icon: 'tune', label: i18n.t('admin.configuration'), route: '/(admin)/settings' },
  ];
  const chosen = usePreferencesStore((st) => st.adminShortcuts);
  const setPrefs = usePreferencesStore((st) => st.set);
  const [editShortcuts, setEditShortcuts] = useState(false);
  const shortcuts = chosen.map((k) => catalog.find((c) => c.key === k)).filter((c): c is NonNullable<typeof c> => !!c);
  const toggleShortcut = (key: string) => {
    if (chosen.includes(key)) setPrefs({ adminShortcuts: chosen.filter((k) => k !== key) });
    else if (chosen.length < 6) setPrefs({ adminShortcuts: [...chosen, key] });
  };

  const { data: teamOnShift, isLoading: teamLoading } = useTeamOnShift();
  const liveClasses = (staffToday?.sessions ?? []).filter((c) => {
    const n = nowMs;
    return new Date(c.startsAt).getTime() <= n && n <= new Date(c.endsAt).getTime();
  });
  const renewals = [...(expiring ?? [])].sort((x, y) => new Date(x.endDate).getTime() - new Date(y.endDate).getTime()).slice(0, 3);
  const lastPayments = (payments ?? []).slice(0, 3);
  const daysUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - nowMs) / 86_400_000));
  const clockOf = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

  const setupTone = {
    danger: { bg: colors.dangerSoft, fg: colors.dangerInk, icon: 'error-outline' as const },
    warning: { bg: colors.warningSoft, fg: colors.warningInk, icon: 'warning-amber' as const },
    info: { bg: colors.infoSoft, fg: colors.infoInk, icon: 'info-outline' as const },
  } as const;

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
          <NotificationBell onPress={() => router.push('/(admin)/inbox')} />
          <Pressable onPress={() => router.push('/(admin)/profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        {!isOnline ? <OfflineBanner lastSyncAt={lastSyncAt} /> : null}

        <Pressable
          style={({ pressed }) => [styles.heroShadow, pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={() => router.push('/(admin)/cash')}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('common.encaissements')}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <View style={styles.heroTop}>
              <Text style={[styles.heroKicker, { flex: 1 }]}>{i18n.t('admin.encaisse_en', { v1: monthName.toUpperCase() })}</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
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
        </Pressable>

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

        <View style={[styles.shortcutsHead, styles.sectionRow]}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.shortcuts')}</Text>
          <Pressable onPress={() => setEditShortcuts(true)} hitSlop={8} style={styles.editPill}>
            <MaterialIcons name="tune" size={15} color={colors.primaryInk} />
            <Text style={styles.editPillText}>{i18n.t('admin.edit_shortcuts')}</Text>
          </Pressable>
        </View>
        <View style={styles.shortcuts}>
          {shortcuts.map((sc) => (
            <Pressable
              key={sc.key}
              onPress={() => router.push(sc.route as never)}
              style={({ pressed }) => [styles.shortcut, cardShadow, { width: shortcutWidth }, pressed && { transform: [{ scale: 0.97 }] }]}
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

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.key_figures')}</Text>
        </View>
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
          <Text style={styles.sectionTitle}>{i18n.t('admin.activity_title')}</Text>
          <Text style={styles.sectionDate}>{new Date().toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        <View style={styles.activityRow}>
          {[
            { v: data?.attendanceToday ?? 0, l: i18n.t('staff.presences'), icon: 'event-available' as const, bg: colors.primarySoft, fg: colors.primaryInk },
            { v: data?.newMembersToday ?? 0, l: i18n.t('admin.new_members'), icon: 'person-add' as const, bg: colors.successSoft, fg: colors.successInk },
            { v: data?.paymentsToday ?? 0, l: i18n.t('staff.paiements'), icon: 'payments' as const, bg: colors.warningSoft, fg: colors.warningInk },
          ].map((c) => (
            <View key={c.l} style={[styles.activityCard, cardShadow]}>
              <View style={[styles.activityIcon, { backgroundColor: c.bg }]}>
                <MaterialIcons name={c.icon} size={20} color={c.fg} />
              </View>
              <Text style={styles.activityValue} numberOfLines={1} adjustsFontSizeToFit>{nf(c.v)}</Text>
              <Text style={styles.activityLabel} numberOfLines={2}>{c.l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.live_classes')}</Text>
        </View>
        {todayLoading ? <SkeletonList count={1} height={96} /> : liveClasses.length === 0 ? (
          <View style={[styles.alert, cardShadow]}>
            <View style={[styles.alertIcon, { backgroundColor: colors.surface2 }]}>
              <MaterialIcons name="event-busy" size={22} color={colors.muted} />
            </View>
            <Text style={styles.alertTitle}>{i18n.t('admin.no_live_classes')}</Text>
          </View>
        ) : (
          liveClasses.map((c) => (
            <Pressable key={c.id} style={({ pressed }) => [styles.block, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => router.push('/(admin)/(tabs)/planning')}>
              <View style={styles.blockTop}>
                <View style={styles.liveDot} />
                <Text style={styles.blockTitle} numberOfLines={1}>{c.classTypeName}</Text>
                <Text style={[styles.blockMeta, { flexShrink: 0 }]} numberOfLines={1}>{clockOf(c.startsAt)} – {clockOf(c.endsAt)}</Text>
              </View>
              <ProgressBar progress={c.capacity > 0 ? c.booked / c.capacity : 0} color={c.fillRate >= 100 ? colors.danger : c.fillRate >= 70 ? colors.warning : colors.primary} />
              <View style={styles.blockTop}>
                <Text style={[styles.blockMeta, { flex: 1 }]} numberOfLines={1}>{[c.coachName, c.room].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.blockStrong}>{i18n.t('common.inscrits', { bookings: c.booked, capacity: c.capacity })} · {Math.round(c.fillRate)}%</Text>
              </View>
            </Pressable>
          ))
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.team_on_shift')}</Text>
          <Pressable onPress={() => router.push('/(admin)/team')} hitSlop={8}>
            <Text style={styles.link}>{i18n.t('staff.voir_tout')}</Text>
          </Pressable>
        </View>
        {teamLoading ? <SkeletonList count={2} /> : (teamOnShift ?? []).length === 0 ? (
          <View style={[styles.alert, cardShadow]}>
            <View style={[styles.alertIcon, { backgroundColor: colors.surface2 }]}>
              <MaterialIcons name="groups" size={22} color={colors.muted} />
            </View>
            <Text style={styles.alertTitle}>{i18n.t('admin.no_one_on_shift', { day: new Date().toLocaleDateString(dateLocale(), { weekday: 'long' }) })}</Text>
          </View>
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {(teamOnShift ?? []).map((m, i) => (
              <View key={m.id} style={[styles.listRow, i > 0 && styles.listBorder]}>
                <View style={[styles.alertIcon, { backgroundColor: colors.primarySoft }]}>
                  <MaterialIcons name={m.role === 'COACH' ? 'sports-gymnastics' : 'badge'} size={22} color={colors.primaryInk} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.alertTitle} numberOfLines={1}>{m.firstName} {m.lastName}</Text>
                  <Text style={styles.alertSub}>{i18n.t(`admin.role_${m.role}`)} · {m.startTime} – {m.endTime}</Text>
                </View>
                {m.onDutyNow ? (
                  <View style={styles.dutyTag}>
                    <Text style={styles.dutyText}>{i18n.t('admin.on_duty_now')}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.renewals')}</Text>
          <Pressable onPress={() => router.push({ pathname: '/(admin)/(tabs)/members', params: { status: 'expiring' } })} hitSlop={8}>
            <Text style={styles.link}>{i18n.t('staff.voir_tout')}</Text>
          </Pressable>
        </View>
        {expiringLoading ? <SkeletonList count={3} /> : renewals.length === 0 ? (
          <View style={[styles.alert, cardShadow]}>
            <View style={[styles.alertIcon, { backgroundColor: colors.successSoft }]}>
              <MaterialIcons name="check-circle" size={22} color={colors.successInk} />
            </View>
            <Text style={styles.alertTitle}>{i18n.t('admin.renewals_none')}</Text>
          </View>
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {renewals.map((r, i) => {
              const d = daysUntil(r.endDate);
              return (
                <View key={r.id} style={[styles.listRow, i > 0 && styles.listBorder]}>
                  <View style={[styles.alertIcon, { backgroundColor: d <= 2 ? colors.dangerSoft : colors.warningSoft }]}>
                    <MaterialIcons name="schedule" size={22} color={d <= 2 ? colors.dangerInk : colors.warningInk} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.alertTitle} numberOfLines={1}>{r.user.firstName} {r.user.lastName}</Text>
                    <Text style={styles.alertSub} numberOfLines={1}>{r.plan.name}</Text>
                    <View style={[styles.expiryTag, { backgroundColor: d <= 2 ? colors.dangerSoft : colors.warningSoft }]}>
                      <Text style={[styles.expiryText, { color: d <= 2 ? colors.dangerInk : colors.warningInk }]} numberOfLines={1}>
                        {d === 0 ? i18n.t('admin.expires_today') : i18n.t('admin.expires_in', { days: d })}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityLabel={i18n.t('staff.appeler')}
                    disabled={!r.user.phone}
                    onPress={() => r.user.phone && Linking.openURL(`tel:${r.user.phone}`)}
                    style={[styles.callBtn, !r.user.phone && { opacity: 0.35 }]}
                  >
                    <MaterialIcons name="call" size={20} color={colors.primaryContrast} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.recent_payments')}</Text>
          <Pressable onPress={() => router.push('/(admin)/cash')} hitSlop={8}>
            <Text style={styles.link}>{i18n.t('admin.see_history')}</Text>
          </Pressable>
        </View>
        {paymentsLoading ? <SkeletonList count={3} /> : lastPayments.length === 0 ? (
          <View style={[styles.alert, cardShadow]}>
            <View style={[styles.alertIcon, { backgroundColor: colors.surface2 }]}>
              <MaterialIcons name="receipt-long" size={22} color={colors.muted} />
            </View>
            <Text style={styles.alertTitle}>{i18n.t('staff.aucun_encaissement_pour_le_moment')}</Text>
          </View>
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {lastPayments.map((p, i) => (
              <Pressable key={p.id} onPress={() => router.push({ pathname: '/(admin)/cash-receipt', params: { paymentId: p.id } })} style={[styles.listRow, i > 0 && styles.listBorder]}>
                <View style={[styles.alertIcon, { backgroundColor: colors.successSoft }]}>
                  <MaterialIcons name="payments" size={22} color={colors.successInk} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.alertTitle} numberOfLines={1}>{p.membership.user.firstName} {p.membership.user.lastName}</Text>
                  <Text style={styles.alertSub} numberOfLines={1}>{p.membership.plan.name} · {new Date(p.recordedAt).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })}</Text>
                </View>
                <Text style={styles.blockStrong}>{money(p.amount)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{i18n.t('admin.alertes')}</Text>
          <Text style={styles.sectionCount}>{alerts.length}</Text>
        </View>
        {todayLoading || expiringLoading ? <SkeletonList count={1} height={64} /> : alerts.length === 0 ? (
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
      <BottomSheet visible={editShortcuts} onClose={() => setEditShortcuts(false)}>
        <Text style={styles.sheetTitle}>{i18n.t('admin.customize_shortcuts')}</Text>
        <Text style={styles.sheetText}>{i18n.t('admin.customize_hint')}</Text>
        <View style={{ gap: 6, marginTop: 4 }}>
          {catalog.map((c) => {
            const on = chosen.includes(c.key);
            const disabled = !on && chosen.length >= 6;
            return (
              <View key={c.key} style={[styles.pickRow, disabled && { opacity: 0.45 }]}>
                <View style={styles.pickIcon}>
                  <MaterialIcons name={c.icon} size={20} color={colors.primaryInk} />
                </View>
                <Text style={styles.pickLabel} numberOfLines={1}>{c.label}</Text>
                <Switch value={on} disabled={disabled} onValueChange={() => toggleShortcut(c.key)} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
              </View>
            );
          })}
        </View>
        {chosen.length >= 6 ? <Text style={styles.sheetText}>{i18n.t('admin.shortcut_limit')}</Text> : null}
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={i18n.t('admin.shortcut_reset')} variant="outline" onPress={() => setPrefs({ adminShortcuts: DEFAULT_ADMIN_SHORTCUTS })} />
          <Button label={i18n.t('common.close')} onPress={() => setEditShortcuts(false)} />
        </View>
      </BottomSheet>
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
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroDecor: { position: 'absolute', right: -50, top: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.1)' },
    heroKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.92)' },
    heroValue: { fontFamily: fonts.head, fontSize: 46, letterSpacing: -2, color: '#FFFFFF', marginTop: 6 },
    heroPill: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
    heroPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    kpiRow: { flexDirection: 'row', gap: 10 },
    editPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.primarySoft },
    editPillText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.primaryInk },
    sectionDate: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted, textTransform: 'capitalize' },
    activityRow: { flexDirection: 'row', gap: 10 },
    activityCard: { flex: 1, minWidth: 0, padding: 12, gap: 4, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    activityIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    activityValue: { fontFamily: fonts.head, fontSize: 30, letterSpacing: -1.2, color: colors.text },
    activityLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 15, color: colors.muted },
    block: { padding: 14, gap: 10, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    blockTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    blockTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    blockMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    blockStrong: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success },
    link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    expiryTag: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, maxWidth: '100%' },
    expiryText: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
    listCard: { overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minWidth: 0 },
    listBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    dutyTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.successSoft },
    dutyText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.successInk },
    callBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.surface2 },
    pickIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    pickLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
    kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    shortcutsHead: { marginTop: 6 },
    shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    shortcut: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    shortcutIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    shortcutLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
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
      minWidth: 0,
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14,
      backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border,
    },
    alertIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    alertTitle: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    alertSub: { flexShrink: 1, fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  });
}
