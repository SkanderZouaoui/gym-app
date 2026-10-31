import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useStaffRoutes } from '../../navigation/staffRoutes';
import { useTheme } from '../../theme/ThemeContext';
import { ResetPasswordButton } from '../ResetPasswordButton';
import { resetMemberPassword, useMemberDetail, useMemberMemberships, useMemberPayments } from '../../hooks/useStaff';
import { useOfflineAwareRefresh } from '../../hooks/useOfflineAwareRefresh';
import { EmptyState, DetailSkeleton } from '../ui';
import { formatMoney, METHOD_LABEL } from './staffUi';
import { MemberIdentity } from './MemberIdentity';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../../i18n';
import { useNow } from '../../hooks/useNow';

const fmtDate = (d: string, year = true) =>
  new Date(d).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });

interface Props {
  /** `staff` : fiche complète. `coach` : profil simple, sans abonnement, encaissement, paiements ni mot de passe provisoire. */
  variant: 'staff' | 'coach';
}

/** Fiche adhérent : identité, coordonnées ; pour l'accueil aussi abonnement en cours, paiements, renouvellement. */
export function MemberProfileScreen({ variant }: Props) {
  const full = variant === 'staff';
  const nowMs = useNow();
  const { t } = useTranslation();
  const routes = useStaffRoutes();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: member, isLoading, refetch } = useMemberDetail(id);
  const { data: memberships, refetch: refetchMemberships } = useMemberMemberships(id, full);
  const { data: memberPayments = [], refetch: refetchPayments } = useMemberPayments(memberships);
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetch(), refetchMemberships(), refetchPayments()]));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace(full ? routes.members : ('/(coach)/(tabs)/planning' as never)));

  if (isLoading && !member) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }
  if (!member) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <EmptyState icon="person-off" title={t('staff.adherent_introuvable')} text={t('staff.cet_adherent_nexiste_plus')} tone="danger" actionLabel={t('common.retour')} onAction={goBack} />
        </View>
      </SafeAreaView>
    );
  }

  const sorted = [...(memberships ?? [])].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  const current = sorted.find((m) => m.status === 'ACTIVE') ?? sorted[0];
  const total = current ? Math.max(1, new Date(current.endDate).getTime() - new Date(current.startDate).getTime()) : 1;
  const elapsed = current ? Math.min(total, Math.max(0, nowMs - new Date(current.startDate).getTime())) : 0;
  const ratio = elapsed / total;
  const daysLeft = current ? Math.max(0, Math.ceil((new Date(current.endDate).getTime() - nowMs) / 86_400_000)) : null;
  const paidTotal = memberPayments.reduce((s, p) => s + Number(p.amount), 0);

  const rows = [
    { icon: 'call' as const, k: t('common.telephone'), v: member.phone ?? '—' },
    { icon: 'mail-outline' as const, k: t('common.email'), v: member.email ?? '—' },
    ...(member.createdAt ? [{ icon: 'event' as const, k: t('staff.membre_depuis'), v: fmtDate(member.createdAt) }] : []),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.adherents')}</Text>
        </Pressable>

        <MemberIdentity
          firstName={member.firstName}
          lastName={member.lastName}
          photoUrl={member.photoUrl}
          memberCode={member.memberCode}
          ratio={ratio}
          status={current?.status}
          daysLeft={daysLeft}
          showSubscription={full}
        />

        <View style={styles.actions}>
          {[
            { icon: 'call' as const, label: t('staff.appeler'), on: member.phone ? () => Linking.openURL(`tel:${member.phone}`) : undefined },
            { icon: 'mail-outline' as const, label: t('common.e_mail'), on: member.email ? () => Linking.openURL(`mailto:${member.email}`) : undefined },
            ...(full ? [{ icon: 'payments' as const, label: t('staff.encaisser'), on: () => router.push({ pathname: routes.cashSell, params: { memberId: member.id } }) }] : []),
          ].map((a) => (
            <Pressable
              key={a.label}
              disabled={!a.on}
              onPress={a.on}
              style={({ pressed }) => [styles.action, cardShadow, !a.on && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <View style={styles.actionIcon}>
                <MaterialIcons name={a.icon} size={20} color={colors.primaryInk} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {full ? (
          <>
        {current ? (
          <View style={styles.heroShadow}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroDecor} />
              <Text style={styles.heroKicker}>{t('staff.abonnement')}</Text>
              <Text style={styles.heroTitle}>{current.plan.name}</Text>
              <Text style={styles.heroSub}>{fmtDate(current.startDate, false)} → {fmtDate(current.endDate)}</Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.round(ratio * 100)}%` }]} />
              </View>
              <View style={styles.heroBottom}>
                <Text style={styles.heroBottomText}>{t('staff.ecoule', { v0: Math.round(ratio * 100) })}</Text>
                <Text style={[styles.heroBottomText, { fontFamily: fonts.bodyBold }]}>
                  {current.status === 'ACTIVE' ? `${daysLeft} jour${(daysLeft ?? 0) > 1 ? 's' : ''} restant${(daysLeft ?? 0) > 1 ? 's' : ''}` : t('staff.expire')}
                </Text>
              </View>
            </LinearGradient>
          </View>
        ) : (
          <View style={[styles.noPlan, cardShadow]}>
            <View style={styles.noPlanIcon}>
              <MaterialIcons name="card-membership" size={30} color={colors.primaryInk} />
            </View>
            <Text style={styles.noPlanTitle}>{t('staff.pas_encore_dabonnement')}</Text>
            <Text style={styles.noPlanText}>{t('staff.souscrivez_un_forfait_pour_que')}</Text>
            <Pressable
              onPress={() => router.push({ pathname: routes.cashSell, params: { memberId: member.id } })}
              style={({ pressed }) => [styles.ctaShadow, { alignSelf: 'stretch' }, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>{t('staff.souscrire_un_abonnement')}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {current ? (
        <View style={styles.statsRow}>
          {[
            { n: String(sorted.length), l: t('admin.abonnements') },
            { n: String(memberPayments.length), l: t('staff.paiements') },
            { n: formatMoney(paidTotal), l: t('common.encaisse') },
          ].map((s) => (
            <View key={s.l} style={[styles.statCard, cardShadow]}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{s.n}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>
        ) : null}

          </>
        ) : null}

        <View>
          <Text style={styles.sectionTitle}>{t('common.coordonnees')}</Text>
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

        {full ? (
          <>
        <View>
          <Text style={styles.sectionTitle}>{t('staff.paiements')}</Text>
          <View style={[styles.listCard, cardShadow]}>
            {memberPayments.length === 0 ? (
              <Text style={styles.emptyRow}>{t('staff.aucun_paiement_enregistre')}</Text>
            ) : (
              memberPayments.map((p, i) => (
                <View key={p.id} style={[styles.row, i < memberPayments.length - 1 && styles.rowBorder]}>
                  <MaterialIcons name="receipt-long" size={22} color={colors.primaryInk} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowValue}>{p.planName}</Text>
                    <Text style={styles.rowKey}>{fmtDate(p.recordedAt)} · {METHOD_LABEL[p.method]}</Text>
                  </View>
                  <Text style={styles.amount}>{formatMoney(p.amount)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <ResetPasswordButton name={`${member.firstName} ${member.lastName}`} email={member.email} reset={() => resetMemberPassword(member.id)} />

        {current ? (
        <Pressable
          onPress={() => router.push({ pathname: routes.cashSell, params: { memberId: member.id } })}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="payments" size={24} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{t('staff.renouveler_labonnement')}</Text>
          </LinearGradient>
        </Pressable>
        ) : null}
          </>
        ) : null}
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
    actions: { flexDirection: 'row', gap: 10 },
    action: {
      flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    actionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text },
    noPlan: {
      alignItems: 'center', gap: 8, padding: 20, backgroundColor: colors.surface, borderRadius: radii.xl,
      borderWidth: 1, borderColor: colors.primaryBorder,
    },
    noPlanIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    noPlanTitle: { fontFamily: fonts.head, fontSize: 19, letterSpacing: -0.5, color: colors.text },
    noPlanText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted, textAlign: 'center', marginBottom: 6 },
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
