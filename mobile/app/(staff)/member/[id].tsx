import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMemberDetail, useMemberMemberships, usePayments } from '../../../src/hooks/useStaff';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { EmptyState } from '../../../src/components/ui';
import { StatusTag, formatMoney, membershipBadge, METHOD_LABEL } from '../../../src/components/staff/staffUi';

const RING = 104;
const STROKE = 5;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

const fmtDate = (d: string, year = true) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });

/** Fiche adhérent (accueil) : identité, abonnement en cours, coordonnées, paiements, renouvellement. */
export default function StaffMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: member, isLoading, refetch } = useMemberDetail(id);
  const { data: memberships, refetch: refetchMemberships } = useMemberMemberships(id);
  const { data: payments, refetch: refetchPayments } = usePayments();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetch(), refetchMemberships(), refetchPayments()]));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(staff)/(tabs)/members'));

  if (isLoading && !member) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!member) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <EmptyState icon="person-off" title="Adhérent introuvable" text="Cet adhérent n'existe plus." tone="danger" actionLabel="Retour" onAction={goBack} />
        </View>
      </SafeAreaView>
    );
  }

  const sorted = [...(memberships ?? [])].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  const current = sorted.find((m) => m.status === 'ACTIVE') ?? sorted[0];
  const total = current ? Math.max(1, new Date(current.endDate).getTime() - new Date(current.startDate).getTime()) : 1;
  const elapsed = current ? Math.min(total, Math.max(0, Date.now() - new Date(current.startDate).getTime())) : 0;
  const ratio = elapsed / total;
  const daysLeft = current ? Math.max(0, Math.ceil((new Date(current.endDate).getTime() - Date.now()) / 86_400_000)) : null;
  const badge = membershipBadge(current?.status, daysLeft);
  const memberPayments = (payments ?? []).filter((p) => p.membership.userId === member.id);
  const paidTotal = memberPayments.reduce((s, p) => s + Number(p.amount), 0);
  const initials = `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();

  const rows = [
    { icon: 'call' as const, k: 'Téléphone', v: member.phone ?? '—' },
    { icon: 'mail-outline' as const, k: 'Email', v: member.email ?? '—' },
    ...(member.createdAt ? [{ icon: 'event' as const, k: 'Membre depuis', v: fmtDate(member.createdAt) }] : []),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Adhérents</Text>
        </Pressable>

        <View style={styles.identity}>
          <View style={{ width: RING, height: RING }}>
            <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={colors.surface2} strokeWidth={STROKE} fill="none" />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke={colors.primary}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={CIRC * (1 - ratio)}
              />
            </Svg>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.name}>{member.firstName} {member.lastName}</Text>
          <StatusTag label={badge.label} tone={badge.tone} />
        </View>

        {current ? (
          <View style={styles.heroShadow}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroDecor} />
              <Text style={styles.heroKicker}>ABONNEMENT</Text>
              <Text style={styles.heroTitle}>{current.plan.name}</Text>
              <Text style={styles.heroSub}>{fmtDate(current.startDate, false)} → {fmtDate(current.endDate)}</Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.round(ratio * 100)}%` }]} />
              </View>
              <View style={styles.heroBottom}>
                <Text style={styles.heroBottomText}>{Math.round(ratio * 100)} % écoulé</Text>
                <Text style={[styles.heroBottomText, { fontFamily: fonts.bodyBold }]}>
                  {current.status === 'ACTIVE' ? `${daysLeft} jour${(daysLeft ?? 0) > 1 ? 's' : ''} restant${(daysLeft ?? 0) > 1 ? 's' : ''}` : 'Expiré'}
                </Text>
              </View>
            </LinearGradient>
          </View>
        ) : (
          <View style={[styles.noPlan, cardShadow]}>
            <MaterialIcons name="card-membership" size={26} color={colors.primaryInk} />
            <Text style={styles.noPlanText}>Aucun abonnement enregistré pour cet adhérent.</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          {[
            { n: String(sorted.length), l: 'Abonnements' },
            { n: String(memberPayments.length), l: 'Paiements' },
            { n: formatMoney(paidTotal), l: 'Encaissé' },
          ].map((s) => (
            <View key={s.l} style={[styles.statCard, cardShadow]}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{s.n}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Coordonnées</Text>
          <View style={[styles.listCard, cardShadow]}>
            {rows.map((r, i) => (
              <View key={r.k} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
                <View style={styles.rowIcon}>
                  <MaterialIcons name={r.icon} size={20} color={colors.primaryInk} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowKey}>{r.k}</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>{r.v}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Paiements</Text>
          <View style={[styles.listCard, cardShadow]}>
            {memberPayments.length === 0 ? (
              <Text style={styles.emptyRow}>Aucun paiement enregistré.</Text>
            ) : (
              memberPayments.map((p, i) => (
                <View key={p.id} style={[styles.row, i < memberPayments.length - 1 && styles.rowBorder]}>
                  <MaterialIcons name="receipt-long" size={22} color={colors.primaryInk} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowValue}>{p.membership.plan.name}</Text>
                    <Text style={styles.rowKey}>{fmtDate(p.recordedAt)} · {METHOD_LABEL[p.method]}</Text>
                  </View>
                  <Text style={styles.amount}>{formatMoney(p.amount)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <Pressable
          onPress={() => router.push({ pathname: '/(staff)/cash-sell', params: { memberId: member.id } })}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="payments" size={24} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>Renouveler / souscrire</Text>
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
    identity: { alignItems: 'center', gap: 8, paddingBottom: 6 },
    avatar: {
      position: 'absolute', top: 9, left: 9, right: 9, bottom: 9, borderRadius: 43, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -0.9, color: '#FFFFFF' },
    name: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -1, color: colors.text, textAlign: 'center' },
    heroShadow: {
      borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
    },
    hero: { borderRadius: radii.xl, padding: 22, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.92)' },
    heroTitle: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -1, color: '#FFFFFF', marginTop: 4 },
    heroSub: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
    track: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)', marginTop: 18, overflow: 'hidden' },
    trackFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFFFFF' },
    heroBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    heroBottomText: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.95)' },
    noPlan: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.surface, borderRadius: radii.lg,
      borderWidth: 1, borderColor: colors.border,
    },
    noPlanText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    statValue: { fontFamily: fonts.head, fontSize: 22, lineHeight: 26, letterSpacing: -0.8, color: colors.text },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginTop: 2 },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10, marginTop: 6 },
    listCard: { paddingHorizontal: 16, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    rowKey: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    rowValue: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
    amount: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
    emptyRow: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, paddingVertical: 16 },
    ctaShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 6,
    },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
