import { useEffect, useMemo, useState } from 'react';
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
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '../../src/utils/haptics';
import { useGender } from '../../src/hooks/useGender';
import { bookingStatusLabel } from '../../src/utils/gendered';
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
  const gender = useGender();
  const reduceMotion = useReducedMotion();

  // Pastille qui glisse sous l'onglet choisi.
  const [segWidth, setSegWidth] = useState(0);
  const tabIndex = tab === 'upcoming' ? 0 : tab === 'waitlist' ? 1 : 2;
  const itemW = segWidth > 0 ? (segWidth - 8 - 8) / 3 : 0;
  const thumbX = useSharedValue(4);
  useEffect(() => {
    const x = 4 + tabIndex * (itemW + 4);
    thumbX.value = reduceMotion ? x : withTiming(x, { duration: 260, easing: Easing.bezier(0.3, 0.9, 0.3, 1) });
  }, [tabIndex, itemW, reduceMotion, thumbX]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbX.value }] }));

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
        <View style={styles.tabs} onLayout={(e) => setSegWidth(e.nativeEvent.layout.width)}>
          {itemW > 0 ? <Animated.View pointerEvents="none" style={[styles.thumb, { width: itemW }, thumbStyle]} /> : null}
          {tabs.map((t) => {
            const active = t.value === tab;
            return (
              <Pressable key={t.value} style={styles.tab} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { if (!active) haptics.selection(); setTab(t.value); }}>
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t.label}</Text>
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
          // Pastille d'état : prochain cours, rang en liste d'attente, ou statut final (accordé au genre) pour les passées.
          const pill: { label: string; bg: string; fg: string; icon: keyof typeof MaterialIcons.glyphMap } | null =
            tab === 'upcoming' && index === 0
              ? { label: i18n.t('member.prochain'), bg: colors.deep, fg: '#FFFFFF', icon: 'bolt' }
              : item.status === 'WAITLISTED' && item.waitlistPosition
                ? { label: i18n.t('member.e_en_liste_dattente', { waitlistPosition: item.waitlistPosition }), bg: colors.warningSoft, fg: colors.warningInk, icon: 'hourglass-top' }
                : tab === 'past'
                  ? STATUS_PILL[item.status](colors, bookingStatusLabel(item.status, gender))
                  : null;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => item.sessionId && router.push(`/(member)/session/${item.sessionId}`)}
            >
              {date ? (
                <LinearGradient colors={tab === 'past' ? [colors.surface2, colors.surface2] : [colors.deep, colors.deepPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dateBlock}>
                  <Text style={[styles.dateDay, tab === 'past' && { color: colors.muted }]}>
                    {date.toLocaleDateString(dateLocale(), { weekday: 'short' }).replace('.', '')}
                  </Text>
                  <Text style={[styles.dateNumber, tab === 'past' && { color: colors.text }]}>{date.getDate()}</Text>
                </LinearGradient>
              ) : null}
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={styles.className} numberOfLines={1}>{session?.classType.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
                {pill ? (
                  <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                    <MaterialIcons name={pill.icon} size={12} color={pill.fg} />
                    <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
                  </View>
                ) : null}
              </View>
              {tab !== 'past' && !(session && new Date(session.endsAt).getTime() < nowMs) ? (
                <Pressable style={styles.cancelButton} onPress={() => setCancelTarget(item)} hitSlop={6} accessibilityRole="button">
                  <MaterialIcons name="close" size={18} color={colors.dangerInk} />
                </Pressable>
              ) : (
                <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
              )}
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
        <View style={styles.confirmIcon}>
          <MaterialIcons name="event-busy" size={30} color={colors.dangerInk} />
        </View>
        <Text style={styles.sheetTitle}>
          {cancelTarget?.status === 'WAITLISTED' ? i18n.t('member.quitter_la_liste_dattente') : `Annuler ${cancelTarget?.session?.classType.name} ?`}
        </Text>
        <Text style={styles.sheetText}>{i18n.t('member.lannulation_est_gratuite_votre_place')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button label={i18n.t('member.oui_annuler')} onPress={confirmCancel} variant="danger" loading={cancelBooking.isPending} />
          <Button label={i18n.t('member.garder_ma_place')} onPress={() => setCancelTarget(null)} variant="outline" />
        </View>
      </BottomSheet>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text={i18n.t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

type Colors = ReturnType<typeof useTheme>['colors'];
const STATUS_PILL: Record<Booking['status'], (c: Colors, label: string) => { label: string; bg: string; fg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  CONFIRMED: (c, label) => ({ label, bg: c.successSoft, fg: c.successInk, icon: 'check' }),
  WAITLISTED: (c, label) => ({ label, bg: c.warningSoft, fg: c.warningInk, icon: 'hourglass-top' }),
  ATTENDED: (c, label) => ({ label, bg: c.successSoft, fg: c.successInk, icon: 'check-circle' }),
  NO_SHOW: (c, label) => ({ label, bg: c.dangerSoft, fg: c.dangerInk, icon: 'person-off' }),
  CANCELLED: (c, label) => ({ label, bg: c.surface2, fg: c.muted, icon: 'block' }),
};

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.lg, gap: 4, paddingBottom: spacing.sm },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 6 },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    tabs: { flexDirection: 'row', padding: 4, gap: 4, marginTop: 12, borderRadius: radii.full, backgroundColor: colors.surface2, position: 'relative' },
    thumb: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: radii.full, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    tab: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
    tabTextActive: { color: colors.text },
    list: { padding: spacing.lg, paddingTop: spacing.sm, gap: 12, paddingBottom: 120 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12,
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    dateBlock: { width: 60, height: 68, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dateDay: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' },
    dateNumber: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.6, color: '#FFFFFF' },
    className: { fontFamily: fonts.headBold, fontSize: 16, letterSpacing: -0.2, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, marginTop: 2 },
    pillText: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
    cancelButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
    confirmIcon: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft, marginBottom: 14 },
    sheetTitle: { fontFamily: fonts.headBold, fontSize: 19, letterSpacing: -0.3, color: colors.text, textAlign: 'center' },
    sheetText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  });
}
