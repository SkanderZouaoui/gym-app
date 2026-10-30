import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useCancelBooking } from '../../src/hooks/useClasses';
import { useMyBookings } from '../../src/hooks/useMe';
import type { Booking } from '../../src/api/types';
import { BottomSheet, EmptyState, ScreenTitle, Toast, SkeletonList } from '../../src/components/ui';
import { Button } from '../../src/components/Button';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../src/i18n';
import { useNow } from '../../src/hooks/useNow';

type Tab = 'upcoming' | 'waitlist' | 'past';

/** Mes réservations — v2 : lien retour, grand titre, pastilles À venir / En attente / Passées,
 * cartes à bloc date en dégradé et bouton d'annulation carré. */
export default function ReservationsScreen() {
  const nowMs = useNow();
  useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: bookings, refetch, isLoading } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const { upcoming, waitlist, past } = useMemo(() => {
    const now = nowMs;
    const result: Record<Tab, Booking[]> = { upcoming: [], waitlist: [], past: [] };
    for (const b of bookings ?? []) {
      const startsAt = b.session ? new Date(b.session.startsAt).getTime() : 0;
      const future = startsAt >= now;
      if (b.status === 'CONFIRMED' && future) result.upcoming.push(b);
      else if (b.status === 'WAITLISTED' && future) result.waitlist.push(b);
      else result.past.push(b);
    }
    const byDate = (a: Booking, b: Booking) =>
      new Date(a.session?.startsAt ?? 0).getTime() - new Date(b.session?.startsAt ?? 0).getTime();
    result.upcoming.sort(byDate);
    result.waitlist.sort(byDate);
    result.past.sort((a, b) => byDate(b, a));
    return result;
  }, [bookings, nowMs]);

  const list = tab === 'upcoming' ? upcoming : tab === 'waitlist' ? waitlist : past;
  const tabs: { value: Tab; label: string }[] = [
    { value: 'upcoming', label: i18n.t('member.a_venir', { length: upcoming.length }) },
    { value: 'waitlist', label: i18n.t('member.en_attente', { length: waitlist.length }) },
    { value: 'past', label: i18n.t('member.passees') },
  ];

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/(member)/(tabs)/planning');
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    cancelBooking.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.back} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{i18n.t('common.planning')}</Text>
        </Pressable>
        <ScreenTitle title={i18n.t('member.mes_reservations')} subtitle={i18n.t('member.a_venir_en_attente', { length: upcoming.length, length_: waitlist.length })} />
        <View style={styles.tabs}>
          {tabs.map((t) => {
            const active = t.value === tab;
            return (
              <Pressable key={t.value} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.value)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item, index }) => {
          const session = item.session;
          const date = session ? new Date(session.startsAt) : null;
          const meta = [
            date?.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }),
            session?.coach?.user.firstName,
            session?.room?.name,
          ].filter(Boolean).join(' · ');
          const note =
            tab === 'upcoming' && index === 0
              ? i18n.t('member.prochain')
              : item.status === 'WAITLISTED' && item.waitlistPosition
                ? i18n.t('member.e_en_liste_dattente', { waitlistPosition: item.waitlistPosition })
                : tab === 'past'
                  ? STATUS_LABEL[item.status]
                  : null;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => item.sessionId && router.push(`/(member)/session/${item.sessionId}`)}
            >
              {date ? (
                <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dateBlock}>
                  <Text style={styles.dateDay}>
                    {date.toLocaleDateString(dateLocale(), { weekday: 'short' }).replace('.', '').toUpperCase()}.
                  </Text>
                  <Text style={styles.dateNumber}>{date.getDate()}</Text>
                </LinearGradient>
              ) : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.className} numberOfLines={1}>{session?.classType.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
                {note ? <Text style={styles.note}>{note}</Text> : null}
              </View>
              {tab !== 'past' && !(session && new Date(session.endsAt).getTime() < nowMs) ? (
                <Pressable style={styles.cancelButton} onPress={() => setCancelTarget(item)} hitSlop={6}>
                  <MaterialIcons name="close" size={20} color={colors.dangerInk} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={isLoading ? <SkeletonList count={4} height={84} /> : (<EmptyState
            icon="event-available"
            title={tab === 'upcoming' ? i18n.t('member.aucune_reservation_a_venir') : tab === 'waitlist' ? i18n.t('member.aucune_liste_dattente') : i18n.t('member.aucune_seance_passee')}
            text={
              tab === 'upcoming'
                ? i18n.t('member.vos_prochains_cours_apparaitront_ici')
                : tab === 'waitlist'
                  ? i18n.t('member.les_cours_complets_que_vous')
                  : i18n.t('member.votre_historique_apparaitra_apres_votre')
            }
            tone="primary"
            actionLabel={tab === 'upcoming' ? i18n.t('member.explorer_le_planning') : undefined}
            onAction={tab === 'upcoming' ? () => router.push('/(member)/(tabs)/planning') : undefined}
          />)}
      />

      <BottomSheet visible={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <Text style={styles.sheetTitle}>
          {cancelTarget?.status === 'WAITLISTED' ? i18n.t('member.quitter_la_liste_dattente') : `Annuler ${cancelTarget?.session?.classType.name} ?`}
        </Text>
        <Text style={styles.sheetText}>{i18n.t('member.lannulation_est_gratuite_votre_place')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={i18n.t('member.oui_annuler')} onPress={confirmCancel} variant="secondary" loading={cancelBooking.isPending} />
          <Button label={i18n.t('member.garder_ma_place')} onPress={() => setCancelTarget(null)} variant="outline" />
        </View>
      </BottomSheet>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text={i18n.t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

const STATUS_LABEL: Record<Booking['status'], string> = {
  get CONFIRMED() { return i18n.t('member.confirmee'); },
  get WAITLISTED() { return i18n.t('common.liste_dattente'); },
  get ATTENDED() { return i18n.t('member.presente'); },
  get NO_SHOW() { return i18n.t('member.absente'); },
  get CANCELLED() { return i18n.t('member.annulee'); },
};

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.lg, gap: 4, paddingBottom: spacing.sm },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 6 },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    tabs: { flexDirection: 'row', gap: 8, marginTop: 10 },
    tab: {
      height: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    tabTextActive: { color: colors.primaryContrast },
    list: { padding: spacing.lg, paddingTop: spacing.sm, gap: 10, paddingBottom: 120 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12,
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    dateBlock: { width: 64, height: 68, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dateDay: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: 'rgba(255,255,255,0.85)' },
    dateNumber: { fontFamily: fonts.head, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: '#FFFFFF' },
    className: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
    note: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text, marginTop: 2 },
    cancelButton: {
      width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 19, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
  });
}
