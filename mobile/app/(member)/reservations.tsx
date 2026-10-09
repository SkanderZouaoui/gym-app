import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useCancelBooking } from '../../src/hooks/useClasses';
import { useMyBookings } from '../../src/hooks/useMe';
import type { Booking } from '../../src/api/types';
import { BottomSheet, EmptyState, Pill, SegmentedControl } from '../../src/components/ui';
import { Button } from '../../src/components/Button';
import { ClassTypeIcon } from '../../src/components/adherent/ClassTypeIcon';

const STATUS_TONE: Record<Booking['status'], 'success' | 'warning' | 'muted' | 'danger'> = {
  CONFIRMED: 'success',
  WAITLISTED: 'warning',
  ATTENDED: 'success',
  NO_SHOW: 'danger',
  CANCELLED: 'muted',
};
const STATUS_LABEL: Record<Booking['status'], string> = {
  CONFIRMED: 'Confirmée',
  WAITLISTED: 'Liste d’attente',
  ATTENDED: 'Présente',
  NO_SHOW: 'Absente',
  CANCELLED: 'Annulée',
};

/** Mes réservations — FitZone App Adherent.dc.html, C2. */
export default function ReservationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: bookings } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const now = Date.now();
  const list = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      const startsAt = b.session ? new Date(b.session.startsAt).getTime() : 0;
      const isUpcoming = b.status !== 'CANCELLED' && b.status !== 'ATTENDED' && b.status !== 'NO_SHOW' && startsAt >= now;
      return tab === 'upcoming' ? isUpcoming : !isUpcoming;
    });
  }, [bookings, tab, now]);

  const confirmCancel = () => {
    if (!cancelTarget) return;
    cancelBooking.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Mes réservations" />
      <View style={styles.tabWrap}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: 'À venir' },
            { value: 'past', label: 'Passées' },
          ]}
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <ClassTypeIcon name={item.session?.classType.name ?? ''} />
              <View style={{ flex: 1 }}>
                <Text style={styles.className}>{item.session?.classType.name}</Text>
                <Text style={styles.meta}>
                  {item.session ? new Date(item.session.startsAt).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
              <Pill label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
            </View>
            {item.status === 'WAITLISTED' && item.waitlistPosition ? (
              <Text style={styles.waitlistNote}>
                {item.waitlistPosition}e en liste d’attente. Vous serez inscrite automatiquement si une place se libère.
              </Text>
            ) : null}
            {tab === 'upcoming' ? (
              <View style={styles.actionsRow}>
                <Pressable style={styles.outlineButton} onPress={() => item.sessionId && router.push(`/(member)/session/${item.sessionId}`)}>
                  <Text style={styles.outlineButtonText}>Détails</Text>
                </Pressable>
                <Pressable onPress={() => setCancelTarget(item)}>
                  <Text style={styles.cancelText}>{item.status === 'WAITLISTED' ? 'Quitter la liste' : 'Annuler'}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="event-available"
            title={tab === 'upcoming' ? 'Aucune réservation à venir' : 'Aucune séance passée'}
            text={tab === 'upcoming' ? 'Vos prochains cours apparaîtront ici.' : 'Votre historique apparaîtra après votre premier cours.'}
            tone="primary"
            actionLabel={tab === 'upcoming' ? 'Explorer le planning' : undefined}
            onAction={tab === 'upcoming' ? () => router.push('/(member)/(tabs)/planning') : undefined}
          />
        }
      />

      <BottomSheet visible={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <Text style={styles.sheetTitle}>Annuler {cancelTarget?.session?.classType.name} ?</Text>
        <Text style={styles.sheetText}>
          L’annulation est gratuite. Votre place sera proposée à la liste d’attente.
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Oui, annuler" onPress={confirmCancel} variant="secondary" loading={cancelBooking.isPending} />
          <Button label="Garder ma place" onPress={() => setCancelTarget(null)} variant="outline" />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  tabWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  className: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  waitlistNote: { fontFamily: fonts.body, fontSize: 12, color: colors.warningInk },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outlineButton: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text },
  cancelText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.dangerInk },
  sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 19, color: colors.text },
  sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
  });
}
