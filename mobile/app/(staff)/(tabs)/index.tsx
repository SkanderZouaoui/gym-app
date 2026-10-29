import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe } from '../../../src/hooks/useMe';
import { usePayments, useStaffToday, type StaffTodaySession } from '../../../src/hooks/useStaff';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useStaffRoutes } from '../../../src/navigation/staffRoutes';
import { Avatar } from '../../../src/components/ui';
import { useSessionStore } from '../../../src/store/session';
import { InitialsAvatar, METHOD_LABEL, StatusTag, formatMoney } from '../../../src/components/staff/staffUi';

/** Accueil de l'espace staff : chiffres du jour, raccourcis, cours du jour et derniers encaissements. */
export default function StaffHomeScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const routes = useStaffRoutes();
  const { data: user } = useMe();
  const isAdmin = useSessionStore((st) => st.activeRole) === 'ADMIN';
  const { data: today, refetch: refetchToday } = useStaffToday();
  const { data: payments, refetch: refetchPayments } = usePayments();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetchToday(), refetchPayments()]));

  const now = new Date();
  const dateLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const sessions = today?.sessions ?? [];
  const todayPayments = (payments ?? []).filter((p) => new Date(p.recordedAt).toDateString() === now.toDateString());
  const collectedToday = todayPayments.reduce((s, p) => s + Number(p.amount), 0);
  const upcoming = sessions.filter((s) => new Date(s.endsAt).getTime() >= now.getTime());

  const actions: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'qr-code-scanner', label: 'Scanner un QR', onPress: () => router.push('/(staff)/(tabs)/scanner') },
    { icon: 'point-of-sale', label: 'Encaisser', onPress: () => router.push(routes.cashSelect) },
    { icon: 'person-add', label: 'Nouveau compte', onPress: () => router.push(routes.memberCreate) },
    { icon: 'search', label: 'Chercher un adhérent', onPress: () => router.push(routes.members) },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Avatar initials={`${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'AC'} size={44} background={colors.primarySoft} color={colors.primaryInk} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Bonjour,</Text>
            <Text style={styles.name} numberOfLines={1}>{user?.firstName ?? ''}</Text>
          </View>
        </View>

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <Text style={styles.heroKicker}>{dateLabel.toUpperCase()}</Text>
            <Text style={styles.heroValue}>{formatMoney(collectedToday)}</Text>
            <Text style={styles.heroSub}>{isAdmin ? 'encaissés' : 'encaissés par vous'} aujourd’hui · {todayPayments.length} paiement{todayPayments.length > 1 ? 's' : ''}</Text>
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{sessions.length}</Text>
                <Text style={styles.tileLabel}>Cours du jour</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{today?.attendedToday ?? 0}</Text>
                <Text style={styles.tileLabel}>Présences</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              style={({ pressed }) => [styles.action, cardShadow, pressed && { transform: [{ scale: 0.97 }] }]}
              onPress={a.onPress}
            >
              <View style={styles.actionIcon}>
                <MaterialIcons name={a.icon} size={24} color={colors.primaryInk} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Cours du jour</Text>
          <View style={{ gap: 10 }}>
            {(upcoming.length > 0 ? upcoming : sessions).map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
            {sessions.length === 0 ? (
              <View style={[styles.empty, cardShadow]}>
                <Text style={styles.emptyText}>Aucun cours aujourd’hui.</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{isAdmin ? 'Derniers encaissements' : 'Mes derniers encaissements'}</Text>
            <Pressable onPress={() => router.push(routes.cash)} hitSlop={8}>
              <Text style={styles.link}>Voir tout</Text>
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {(payments ?? []).slice(0, 3).map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.payCard, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={() => router.push({ pathname: routes.cashReceipt, params: { paymentId: p.id } })}
              >
                <InitialsAvatar first={p.membership.user.firstName} last={p.membership.user.lastName} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.payName} numberOfLines={1}>{p.membership.user.firstName} {p.membership.user.lastName}</Text>
                  <Text style={styles.payMeta} numberOfLines={1}>{p.membership.plan.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.payAmount}>{formatMoney(p.amount)}</Text>
                  <StatusTag label={METHOD_LABEL[p.method]} tone="muted" />
                </View>
              </Pressable>
            ))}
            {(payments ?? []).length === 0 ? (
              <View style={[styles.empty, cardShadow]}>
                <Text style={styles.emptyText}>Aucun encaissement pour le moment.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionRow({ session }: { session: StaffTodaySession }) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const time = new Date(session.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const full = session.fillRate >= 100;
  return (
    <Pressable
      style={({ pressed }) => [styles.sessionCard, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
      onPress={() => router.push({ pathname: '/(staff)/(tabs)/scanner', params: { sessionId: session.id } })}
    >
      <View style={styles.timeBlock}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.className} numberOfLines={1}>{session.classTypeName}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[session.coachName, session.room].filter(Boolean).join(' · ') || 'Cours collectif'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={styles.fill}>{session.booked}/{session.capacity}</Text>
        <StatusTag label={full ? 'Complet' : `${session.fillRate} %`} tone={full ? 'danger' : session.fillRate >= 70 ? 'warning' : 'muted'} />
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6 },
    hello: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    name: { fontFamily: fonts.headBold, fontSize: 21, letterSpacing: -0.4, color: colors.text },
    heroShadow: { borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8 },
    hero: { borderRadius: radii.xl, padding: 22, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.92)' },
    heroValue: { fontFamily: fonts.head, fontSize: 40, lineHeight: 46, letterSpacing: -1.8, color: '#FFFFFF', marginTop: 4 },
    heroSub: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.92)' },
    tiles: { flexDirection: 'row', gap: 10, marginTop: 16 },
    tile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
    tileValue: { fontFamily: fonts.head, fontSize: 22, color: '#FFFFFF' },
    tileLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: 'rgba(255,255,255,0.9)' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    action: {
      width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    actionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.text },
    sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10 },
    link: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    sessionCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    timeBlock: { width: 56, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center' },
    timeText: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.4, color: colors.primaryInk },
    className: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    fill: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
    payCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    payName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    payMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    payAmount: { fontFamily: fonts.head, fontSize: 16, color: colors.text },
    empty: { padding: 24, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  });
}
