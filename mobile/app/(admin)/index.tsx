import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMe } from '../../src/hooks/useMe';
import { useAdminDashboard, useDailyAttendance, useExpiringMemberships } from '../../src/hooks/useAdmin';
import { useOpenReports } from '../../src/hooks/useModeration';
import { usePayments } from '../../src/hooks/usePayments';
import { useStaffToday } from '../../src/hooks/useStaff';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { BarHistogram, OfflineBanner, ProgressBar, SkeletonBlock } from '../../src/components/ui';

const nf = (n: number) => n.toLocaleString('fr-FR');
const money = (n: number | string) => `${nf(Math.round(Number(n)))} DT`;

const PAYMENT_ICON: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  CASH: 'payments',
  TRANSFER: 'account-balance',
  CHECK: 'receipt-long',
  OTHER: 'more-horiz',
};

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user, isLoading: userLoading } = useMe();
  const branchId = user?.homeBranchId ?? undefined;
  const { data, isLoading: dashboardLoading } = useAdminDashboard(branchId);
  const { data: dailyAttendance } = useDailyAttendance(branchId);
  const { data: expiring } = useExpiringMemberships(branchId);
  const { data: reports } = useOpenReports();
  const { data: payments } = usePayments(branchId);
  const { data: staffToday } = useStaffToday(branchId);
  const { isOnline, lastSyncAt } = useNetworkStatus();

  const now = Date.now();
  const liveSessions = (staffToday?.sessions ?? []).filter((s) => {
    const start = new Date(s.startsAt).getTime();
    const end = new Date(s.endsAt).getTime();
    return now >= start && now <= end;
  });

  const kpis = [
    { label: 'Adhérents actifs', value: nf(data?.activeMembers ?? 0), icon: 'people' as const, tone: 'success' as const },
    { label: 'Présences du jour', value: nf(data?.attendanceToday ?? 0), icon: 'event-available' as const, tone: 'secondary' as const },
    { label: 'Remplissage moyen', value: `${data?.avgFillRate ?? 0}%`, icon: 'donut-large' as const, tone: 'success' as const },
    { label: 'Encaissé aujourd’hui', value: money(data?.revenueToday ?? 0), icon: 'payments' as const, tone: 'secondary' as const, sub: data ? `${money(data.revenueMonth)} / mois` : undefined },
  ];

  const alerts = [
    staffToday && staffToday.sessions.some((s) => s.fillRate < 30)
      ? { icon: 'trending-down' as const, tone: 'danger' as const, title: 'Cours sous-rempli', sub: 'Remplissage < 30 %', cta: 'Promouvoir', onPress: () => router.push('/(admin)/planning') }
      : null,
    expiring && expiring.length > 0
      ? {
          icon: 'schedule' as const,
          tone: 'warning' as const,
          title: `${expiring.length} abonnement${expiring.length > 1 ? 's' : ''} expirent sous 7 j`,
          sub: expiring.slice(0, 1).map((m) => `${m.user.firstName} ${m.user.lastName}`).join(', '),
          cta: 'Relancer',
          onPress: () => router.push('/(admin)/members'),
        }
      : null,
    reports && reports.length > 0
      ? {
          icon: 'shield' as const,
          tone: 'info' as const,
          title: `${reports.length} signalement${reports.length > 1 ? 's' : ''} à modérer`,
          sub: 'Communauté',
          cta: 'Voir',
          onPress: () => router.push('/(admin)/more'),
        }
      : null,
  ].filter((a): a is NonNullable<typeof a> => a !== null);

  const quickActions: { icon: keyof typeof MaterialIcons.glyphMap; label: string; primary?: boolean; onPress: () => void }[] = [
    { icon: 'space-dashboard', label: 'Tableau de bord', primary: true, onPress: () => {} },
    { icon: 'campaign', label: 'Annonce', onPress: () => router.push('/(admin)/more') },
    { icon: 'payments', label: 'Encaisser', onPress: () => router.push('/(admin)/more') },
    { icon: 'person-search', label: 'Adhérent', onPress: () => router.push('/(admin)/members') },
  ];

  const isLoading = userLoading || dashboardLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <SkeletonBlock height={28} width="50%" radius={radii.xs} />
          <View style={styles.grid}>
            <SkeletonBlock height={90} width="47%" radius={radii.md} />
            <SkeletonBlock height={90} width="47%" radius={radii.md} />
            <SkeletonBlock height={90} width="47%" radius={radii.md} />
            <SkeletonBlock height={90} width="47%" radius={radii.md} />
          </View>
          <SkeletonBlock height={140} radius={radii.lg} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Bonjour {user?.firstName}</Text>
        <Text style={styles.subtitle}>Vue d’ensemble du site</Text>

        {!isOnline ? <OfflineBanner lastSyncAt={lastSyncAt} /> : null}

        <View style={styles.grid}>
          {kpis.map((k) => (
            <View key={k.label} style={styles.kpiCard}>
              <MaterialIcons name={k.icon} size={20} color={colors.primaryInk} />
              <Text style={styles.kpiValue}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              {k.sub ? <Text style={styles.kpiSub}>{k.sub}</Text> : null}
            </View>
          ))}
        </View>

        {liveSessions.length > 0 ? (
          <View style={styles.liveCard}>
            <View style={styles.liveHeaderRow}>
              <View style={styles.liveHeaderLeft}>
                <View style={styles.liveDot} />
                <Text style={styles.liveHeaderText}>En ce moment · {liveSessions.length} cours</Text>
              </View>
              <Text style={styles.liveTime}>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {liveSessions.map((s) => (
              <View key={s.id} style={{ gap: 4 }}>
                <View style={styles.liveRow}>
                  <Text style={styles.liveName}>{s.classTypeName}</Text>
                  <Text style={styles.liveFill}>{s.booked} / {s.capacity}</Text>
                </View>
                <ProgressBar progress={s.capacity > 0 ? s.booked / s.capacity : 0} color={colors.primary} trackColor="rgba(255,255,255,.2)" height={6} />
                <Text style={styles.liveMeta}>{s.coachName ?? ''}{s.room ? ` · ${s.room}` : ''}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.quickGrid}>
          {quickActions.map((q) => (
            <Pressable
              key={q.label}
              style={[styles.quickAction, q.primary ? styles.quickActionPrimary : styles.quickActionDefault]}
              onPress={q.onPress}
            >
              <MaterialIcons name={q.icon} size={24} color={q.primary ? colors.primaryContrast : colors.text} />
              <Text style={[styles.quickActionLabel, { color: q.primary ? colors.primaryContrast : colors.text }]}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {alerts.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>À traiter · {alerts.length}</Text>
            </View>
            {alerts.map((a, i) => (
              <Pressable key={i} style={styles.alertRow} onPress={a.onPress}>
                <View style={[styles.alertIcon, { backgroundColor: toneBg(colors, a.tone) }]}>
                  <MaterialIcons name={a.icon} size={20} color={toneInk(colors, a.tone)} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.alertTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.alertSub} numberOfLines={1}>{a.sub}</Text>
                </View>
                <View style={styles.alertCta}>
                  <Text style={styles.alertCtaText}>{a.cta}</Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        {dailyAttendance ? (
          <View style={styles.attendanceCard}>
            <View style={styles.attendanceHeaderRow}>
              <Text style={styles.attendanceTitle}>Présences · 7 jours</Text>
              <Text style={[styles.attendanceChange, { color: dailyAttendance.changePercent >= 0 ? colors.successInk : colors.dangerInk }]}>
                {dailyAttendance.changePercent >= 0 ? '+' : ''}{dailyAttendance.changePercent}% vs sem. dern.
              </Text>
            </View>
            <BarHistogram values={dailyAttendance.days.map((d) => d.count)} highlightIndex={6} height={64} />
            <View style={styles.attendanceLabels}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <Text key={i} style={styles.attendanceLabel}>{d}</Text>
              ))}
            </View>
          </View>
        ) : null}

        {payments && payments.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.sectionTitle}>Derniers encaissements</Text>
            <View style={styles.paymentList}>
              {payments.slice(0, 3).map((p) => (
                <View key={p.id} style={styles.paymentRow}>
                  <MaterialIcons name={PAYMENT_ICON[p.method] ?? 'payments'} size={22} color={colors.secondaryInk} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.paymentName} numberOfLines={1}>
                      {p.membership.user.firstName} {p.membership.user.lastName}
                    </Text>
                    <Text style={styles.paymentMeta} numberOfLines={1}>{p.membership.plan.name}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>{money(p.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function toneBg(colors: ReturnType<typeof useTheme>['colors'], tone: 'danger' | 'warning' | 'info') {
  return { danger: colors.dangerSoft, warning: colors.warningSoft, info: colors.infoSoft }[tone];
}
function toneInk(colors: ReturnType<typeof useTheme>['colors'], tone: 'danger' | 'warning' | 'info') {
  return { danger: colors.dangerInk, warning: colors.warningInk, info: colors.infoInk }[tone];
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondaryInk },
    subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    kpiCard: {
      width: '47%', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1,
      borderColor: colors.border, padding: spacing.md, gap: 4,
    },
    kpiValue: { fontFamily: fonts.head, fontSize: 22, color: colors.text },
    kpiLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
    kpiSub: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted },
    liveCard: { backgroundColor: colors.secondary, borderRadius: radii.lg, padding: spacing.md, gap: 10 },
    liveHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    liveHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    liveHeaderText: {
      fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.onSecondary,
    },
    liveTime: { fontFamily: fonts.body, fontSize: 12.5, color: colors.onSecondary, opacity: 0.85 },
    liveRow: { flexDirection: 'row', justifyContent: 'space-between' },
    liveName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onSecondary },
    liveFill: { fontFamily: fonts.body, fontSize: 13, color: colors.onSecondary, opacity: 0.9 },
    liveMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.onSecondary, opacity: 0.8 },
    quickGrid: { flexDirection: 'row', gap: 6 },
    quickAction: {
      flex: 1, minHeight: 72, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', gap: 4,
      paddingHorizontal: 4, borderWidth: 1,
    },
    quickActionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    quickActionDefault: { backgroundColor: colors.surface, borderColor: colors.border },
    quickActionLabel: { fontFamily: fonts.bodyBold, fontSize: 11.5, textAlign: 'center' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    alertRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm,
    },
    alertIcon: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
    alertTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.text },
    alertSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    alertCta: { height: 34, paddingHorizontal: 10, borderRadius: radii.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    alertCtaText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.primaryInk },
    attendanceCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: 8 },
    attendanceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    attendanceTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    attendanceChange: { fontFamily: fonts.bodyBold, fontSize: 12 },
    attendanceLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    attendanceLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.muted, textAlign: 'center', flex: 1 },
    paymentList: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, overflow: 'hidden' },
    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    paymentName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    paymentMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    paymentAmount: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
  });
}
