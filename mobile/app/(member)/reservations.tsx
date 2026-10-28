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
import { BottomSheet, EmptyState, ScreenTitle, Toast } from '../../src/components/ui';
import { Button } from '../../src/components/Button';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';

type Tab = 'upcoming' | 'waitlist' | 'past';

/** Mes réservations — v2 : lien retour, grand titre, pastilles À venir / En attente / Passées,
 * cartes à bloc date en dégradé et bouton d'annulation carré. */
export default function ReservationsScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: bookings, refetch } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const { upcoming, waitlist, past } = useMemo(() => {
    const now = Date.now();
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
  }, [bookings]);

  const list = tab === 'upcoming' ? upcoming : tab === 'waitlist' ? waitlist : past;
  const tabs: { value: Tab; label: string }[] = [
    { value: 'upcoming', label: `À venir (${upcoming.length})` },
    { value: 'waitlist', label: `En attente (${waitlist.length})` },
    { value: 'past', label: 'Passées' },
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
          <Text style={styles.backText}>Planning</Text>
        </Pressable>
        <ScreenTitle title="Mes réservations" subtitle={`${upcoming.length} à venir · ${waitlist.length} en attente`} />
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
            date?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            session?.coach?.user.firstName,
            session?.room?.name,
          ].filter(Boolean).join(' · ');
          const note =
            tab === 'upcoming' && index === 0
              ? 'Prochain'
              : item.status === 'WAITLISTED' && item.waitlistPosition
                ? `${item.waitlistPosition}e en liste d’attente`
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
                    {date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase()}.
                  </Text>
                  <Text style={styles.dateNumber}>{date.getDate()}</Text>
                </LinearGradient>
              ) : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.className} numberOfLines={1}>{session?.classType.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
                {note ? <Text style={styles.note}>{note}</Text> : null}
              </View>
              {tab !== 'past' ? (
                <Pressable style={styles.cancelButton} onPress={() => setCancelTarget(item)} hitSlop={6}>
                  <MaterialIcons name="close" size={20} color={colors.dangerInk} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="event-available"
            title={tab === 'upcoming' ? 'Aucune réservation à venir' : tab === 'waitlist' ? 'Aucune liste d’attente' : 'Aucune séance passée'}
            text={
              tab === 'upcoming'
                ? 'Vos prochains cours apparaîtront ici.'
                : tab === 'waitlist'
                  ? 'Les cours complets que vous rejoignez en attente apparaîtront ici.'
                  : 'Votre historique apparaîtra après votre premier cours.'
            }
            tone="primary"
            actionLabel={tab === 'upcoming' ? 'Explorer le planning' : undefined}
            onAction={tab === 'upcoming' ? () => router.push('/(member)/(tabs)/planning') : undefined}
          />
        }
      />

      <BottomSheet visible={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <Text style={styles.sheetTitle}>
          {cancelTarget?.status === 'WAITLISTED' ? 'Quitter la liste d’attente' : `Annuler ${cancelTarget?.session?.classType.name} ?`}
        </Text>
        <Text style={styles.sheetText}>
          L’annulation est gratuite. Votre place sera proposée à la liste d’attente.
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Oui, annuler" onPress={confirmCancel} variant="secondary" loading={cancelBooking.isPending} />
          <Button label="Garder ma place" onPress={() => setCancelTarget(null)} variant="outline" />
        </View>
      </BottomSheet>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text="Pas de connexion — impossible d’actualiser" iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

const STATUS_LABEL: Record<Booking['status'], string> = {
  CONFIRMED: 'Confirmée',
  WAITLISTED: 'Liste d’attente',
  ATTENDED: 'Présente',
  NO_SHOW: 'Absente',
  CANCELLED: 'Annulée',
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
