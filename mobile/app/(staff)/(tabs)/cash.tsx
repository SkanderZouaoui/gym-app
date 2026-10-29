import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useStaffRoutes } from '../../../src/navigation/staffRoutes';
import { useTheme } from '../../../src/theme/ThemeContext';
import { usePayments, type PaymentMethod } from '../../../src/hooks/useStaff';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { ScreenTitle } from '../../../src/components/ui';
import { useSessionStore } from '../../../src/store/session';
import { Pagination } from '../../../src/components/ui/Pagination';
import { DateField } from '../../../src/components/ui/DateTimeFields';
import { InitialsAvatar, METHOD_LABEL, StatusTag, formatMoney } from '../../../src/components/staff/staffUi';

type Filter = 'all' | PaymentMethod;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'CASH', label: 'Espèces' },
  { value: 'OTHER', label: 'Carte' },
  { value: 'TRANSFER', label: 'Virement' },
  { value: 'CHECK', label: 'Chèque' },
];

/** Caisse (accueil) : total encaissé, nouvel encaissement, historique filtrable par moyen de paiement. */
export default function StaffCashScreen() {
  const routes = useStaffRoutes();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isAdmin = useSessionStore((st) => st.activeRole) === 'ADMIN';
  const [filter, setFilter] = useState<Filter>('all');
  const [period, setPeriod] = useState<'month' | 'last' | 'custom'>('month');
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [customFrom, setCustomFrom] = useState(() => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customTo, setCustomTo] = useState(() => iso(new Date()));

  // Plage demandée au serveur (admin uniquement) : début de journée → fin de journée, heure locale.
  const range = useMemo(() => {
    if (!isAdmin) return undefined;
    const n = new Date();
    if (period === 'month') return { from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString(), to: new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59, 999).toISOString() };
    if (period === 'last') return { from: new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString(), to: new Date(n.getFullYear(), n.getMonth(), 0, 23, 59, 59, 999).toISOString() };
    const [fy, fm, fd] = customFrom.split('-').map(Number);
    const [ty, tm, td] = customTo.split('-').map(Number);
    return { from: new Date(fy, fm - 1, fd, 0, 0, 0, 0).toISOString(), to: new Date(ty, tm - 1, td, 23, 59, 59, 999).toISOString() };
  }, [isAdmin, period, customFrom, customTo]);

  const { data: payments, refetch } = usePayments(range);
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);

  const list = payments ?? [];
  const now = new Date();
  // Accueil : total du mois en cours. Admin : total de la période choisie.
  const monthPayments = isAdmin
    ? list
    : list.filter((p) => {
        const d = new Date(p.recordedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
  const monthTotal = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
  const filtered = list.filter((p) => filter === 'all' || p.method === filter);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  // Retour à la première page dès que la période ou le moyen de paiement change.
  useEffect(() => setPage(0), [filter, period, customFrom, customTo]);
  const byMethod = (['CASH', 'OTHER', 'TRANSFER', 'CHECK'] as PaymentMethod[])
    .map((m) => ({ m, total: monthPayments.filter((p) => p.method === m).reduce((s, p) => s + Number(p.amount), 0), count: monthPayments.filter((p) => p.method === m).length }))
    .filter((x) => x.count > 0);
  const fmtShort = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const periodKicker =
    period === 'month' ? 'ENCAISSÉ CE MOIS' : period === 'last' ? 'ENCAISSÉ LE MOIS DERNIER' : `ENCAISSÉ DU ${fmtShort(customFrom).toUpperCase()} AU ${fmtShort(customTo).toUpperCase()}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isAdmin ? (
          <Pressable style={styles.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'))} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
            <Text style={styles.backText}>Plus</Text>
          </Pressable>
        ) : null}
        <ScreenTitle title={isAdmin ? 'Encaissements' : 'Ma caisse'} subtitle={isAdmin ? 'Historique de la caisse de la salle' : 'Les encaissements que vous avez enregistrés'} />

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <Text style={styles.heroKicker}>{isAdmin ? periodKicker : 'VOUS AVEZ ENCAISSÉ CE MOIS'}</Text>
            <Text style={styles.heroValue}>{formatMoney(monthTotal)}</Text>
            <Text style={styles.heroSub}>{monthPayments.length} encaissement{monthPayments.length > 1 ? 's' : ''}</Text>
          </LinearGradient>
        </View>

        {isAdmin ? (
          <View style={{ gap: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {([['month', 'Ce mois'], ['last', 'Mois dernier'], ['custom', 'Période…']] as const).map(([k, l]) => (
                <Pressable key={k} onPress={() => setPeriod(k)} style={[styles.filterPill, period === k && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  <Text style={[styles.filterText, period === k && styles.filterTextActive]}>{l}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {period === 'custom' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><DateField label="Du" value={customFrom} onChange={(v) => { setCustomFrom(v); if (v > customTo) setCustomTo(v); }} /></View>
                <View style={{ flex: 1 }}><DateField label="Au" value={customTo} onChange={(v) => { setCustomTo(v); if (v < customFrom) setCustomFrom(v); }} icon="event-available" /></View>
              </View>
            ) : null}
            {byMethod.length > 0 ? (
              <View style={styles.methodRow}>
                {byMethod.map((x) => (
                  <View key={x.m} style={[styles.methodCell, cardShadow]}>
                    <Text style={styles.methodLabel}>{METHOD_LABEL[x.m]}</Text>
                    <Text style={styles.methodValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(x.total)}</Text>
                    <Text style={styles.methodCount}>{x.count} paiement{x.count > 1 ? 's' : ''}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push(routes.cashSelect)}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="add" size={24} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>Nouvel encaissement</Text>
          </LinearGradient>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
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
        </ScrollView>

        <View style={{ gap: 10 }}>
          {shown.map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push({ pathname: routes.cashReceipt, params: { paymentId: p.id } })}
            >
              <InitialsAvatar first={p.membership.user.firstName} last={p.membership.user.lastName} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{p.membership.user.firstName} {p.membership.user.lastName}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {p.membership.plan.name} · {new Date(p.recordedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.amount}>{formatMoney(p.amount)}</Text>
                <StatusTag label={METHOD_LABEL[p.method]} tone="muted" />
              </View>
            </Pressable>
          ))}
          <Pagination page={currentPage} pageCount={pageCount} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
          {shown.length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <Text style={styles.emptyText}>{isAdmin ? 'Aucun encaissement sur cette période avec ce moyen de paiement.' : 'Aucun encaissement avec ce moyen de paiement.'}</Text>
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
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    heroShadow: {
      borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
    },
    hero: { borderRadius: radii.xl, padding: 22, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.92)' },
    heroValue: { fontFamily: fonts.head, fontSize: 44, lineHeight: 50, letterSpacing: -2, color: '#FFFFFF', marginTop: 4 },
    heroSub: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    filters: { gap: 8 },
    methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    methodCell: { flexGrow: 1, minWidth: '47%', padding: 12, gap: 2, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    methodLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    methodValue: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: colors.text },
    methodCount: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
    filterPill: {
      height: 36, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    filterText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    filterTextActive: { color: colors.primaryContrast },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    amount: { fontFamily: fonts.head, fontSize: 16, color: colors.text },
    empty: { padding: 28, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  });
}
