import { useState } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMe } from '../../src/hooks/useMe';
import { useCreateBooking, useSessions } from '../../src/hooks/useClasses';
import type { ClassSessionSummary } from '../../src/api/types';
import { ApiError } from '../../src/api/client';

export default function PlanningScreen() {
  const { data: user } = useMe();
  const branchId = user?.homeBranchId ?? undefined;
  const { data: sessions, isLoading } = useSessions(branchId);
  const createBooking = useCreateBooking();
  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleBook = (sessionId: string) => {
    setBookingError(null);
    createBooking.mutate(sessionId, {
      onError: (e) => setBookingError(e instanceof ApiError ? e.message : 'Erreur de réservation'),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Planning</Text>
      </View>

      {bookingError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{bookingError}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={sessions ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SessionCard session={item} onBook={() => handleBook(item.id)} booking={createBooking.isPending} />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucun cours programmé pour le moment.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

function SessionCard({
  session,
  onBook,
  booking,
}: {
  session: ClassSessionSummary;
  onBook: () => void;
  booking: boolean;
}) {
  const spotsLeft = session.capacity - session._count.bookings;
  const isFull = spotsLeft <= 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.classIcon}>
          <Text style={styles.classIconText}>{session.classType.name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.className}>{session.classType.name}</Text>
          <Text style={styles.classMeta}>
            {new Date(session.startsAt).toLocaleString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {session.coach ? ` · ${session.coach.user.firstName}` : ''}
          </Text>
        </View>
        <Text style={[styles.spots, isFull && styles.spotsFull]}>
          {isFull ? 'Complet' : `${spotsLeft} places`}
        </Text>
      </View>
      <Pressable
        style={[styles.bookButton, booking && { opacity: 0.6 }]}
        onPress={onBook}
        disabled={booking}
      >
        <Text style={styles.bookButtonText}>{isFull ? "Rejoindre la liste d'attente" : 'Réserver'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  errorBanner: { backgroundColor: colors.dangerSoft, marginHorizontal: spacing.lg, borderRadius: radii.sm, padding: 10 },
  errorBannerText: { fontFamily: fonts.bodyMedium, color: colors.dangerInk, fontSize: 13 },
  empty: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  classIcon: {
    width: 48, height: 48, borderRadius: radii.sm, backgroundColor: colors.secondarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  classIconText: { fontFamily: fonts.headBold, color: colors.secondaryInk, fontSize: 13 },
  className: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
  classMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  spots: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.successInk },
  spotsFull: { color: colors.warningInk },
  bookButton: {
    height: 44, borderRadius: radii.sm, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.primaryBorder,
  },
  bookButtonText: { fontFamily: fonts.bodyBold, color: colors.primaryInk, fontSize: 13.5 },
});
