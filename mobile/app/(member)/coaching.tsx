import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMe } from '../../src/hooks/useMe';
import {
  useCancelCoachingSession,
  useCoachAvailability,
  useMyCoachingSessions,
  useRequestCoachingSession,
} from '../../src/hooks/useMemberCoaching';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'En attente', color: colors.warningInk, bg: colors.warningSoft },
  CONFIRMED: { label: 'Confirmée', color: colors.successInk, bg: colors.successSoft },
  CANCELLED: { label: 'Annulée', color: colors.dangerInk, bg: colors.dangerSoft },
  COMPLETED: { label: 'Terminée', color: colors.muted, bg: colors.surface2 },
};

export default function CoachingScreen() {
  const { data: user } = useMe();
  const { data: availability } = useCoachAvailability(user?.homeBranchId ?? undefined);
  const { data: sessions } = useMyCoachingSessions();
  const requestSession = useRequestCoachingSession();
  const cancelSession = useCancelCoachingSession();
  const [requestingCoachId, setRequestingCoachId] = useState<string | null>(null);

  const handleRequest = (coachId: string) => {
    if (!user?.homeBranchId) return;
    setRequestingCoachId(coachId);

    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 1);
    startsAt.setHours(10, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 60 * 60000);

    requestSession.mutate(
      { coachId, branchId: user.homeBranchId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
      {
        onSuccess: () => Alert.alert('Demande envoyée', 'Le coach confirmera ta séance prochainement.'),
        onSettled: () => setRequestingCoachId(null),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Coaching" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Mes séances</Text>
        {sessions?.length ? (
          sessions.map((s) => {
            const status = STATUS_LABELS[s.status]
            return (
              <View key={s.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coachName}>
                    {s.coach.user.firstName} {s.coach.user.lastName}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    {new Date(s.startsAt).toLocaleString('fr-FR', {
                      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
                {s.status === 'PENDING' || s.status === 'CONFIRMED' ? (
                  <Pressable onPress={() => cancelSession.mutate(s.id)} style={styles.cancelIcon}>
                    <Text style={styles.cancelIconText}>Annuler</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          })
        ) : (
          <Text style={styles.empty}>Aucune séance individuelle pour l'instant.</Text>
        )}

        <Text style={styles.sectionTitle}>Coachs disponibles</Text>
        {availability?.length ? (
          Array.from(new Map(availability.map((a) => [a.coach.user.firstName + a.coach.user.lastName, a])).values()).map(
            (a, i) => (
              <View key={i} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coachName}>
                    {a.coach.user.firstName} {a.coach.user.lastName}
                  </Text>
                  {a.dayOfWeek !== null ? (
                    <Text style={styles.sessionMeta}>
                      {DAYS[a.dayOfWeek]} {a.startTime} - {a.endTime}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => handleRequest(a.coachId)} style={styles.requestButton}>
                  <Text style={styles.requestButtonText}>
                    {requestingCoachId === a.coachId ? '...' : 'Demander'}
                  </Text>
                </Pressable>
              </View>
            ),
          )
        ) : (
          <Text style={styles.empty}>Aucune disponibilité publiée pour le moment.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  coachName: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
  sessionMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  cancelIcon: { paddingHorizontal: 8, paddingVertical: 6 },
  cancelIconText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.dangerInk },
  requestButton: { backgroundColor: colors.primarySoft, borderRadius: radii.xs, paddingHorizontal: 12, paddingVertical: 8 },
  requestButtonText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
  empty: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
});
