import { useMemo } from 'react';
import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useCoachAvailability, useMyCoachingSessions } from '../../src/hooks/useMemberCoaching';
import { EmptyState, Pill } from '../../src/components/ui';
import { CoachCard } from '../../src/components/training/CoachCard';

const STATUS_TONE: Record<string, 'warning' | 'success' | 'danger' | 'muted'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'muted',
  COMPLETED: 'muted',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
};

/** Coachs — annuaire + mes séances individuelles. FitZone App Entraînement.dc.html, G1. */
export default function CoachingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: availability } = useCoachAvailability();
  const { data: sessions } = useMyCoachingSessions();

  const coaches = Array.from(
    new Map(availability?.map((a) => [a.coachId, a]) ?? []).values(),
  );

  const upcomingSessions = sessions?.filter((s) => s.status === 'PENDING' || s.status === 'CONFIRMED') ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Coachs" />
      <FlatList
        data={coaches}
        keyExtractor={(item) => item.coachId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          upcomingSessions.length > 0 ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              <Text style={styles.sectionTitle}>Mes séances</Text>
              {upcomingSessions.map((s) => (
                <View key={s.id} style={styles.sessionCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coachName}>{s.coach.user.firstName} {s.coach.user.lastName}</Text>
                    <Text style={styles.sessionMeta}>
                      {new Date(s.startsAt).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Pill label={STATUS_LABEL[s.status]} tone={STATUS_TONE[s.status]} />
                </View>
              ))}
              <Text style={styles.sectionTitle}>Coachs</Text>
            </View>
          ) : (
            <Text style={[styles.sectionTitle, { marginBottom: spacing.sm }]}>Coachs</Text>
          )
        }
        renderItem={({ item }) => (
          <CoachCard
            firstName={item.coach.user.firstName}
            lastName={item.coach.user.lastName}
            specialties={item.coach.specialties}
            rating={item.coach.rating}
            sessionPrice={item.coach.sessionPrice}
            onPress={() => router.push(`/(member)/coach/${item.coachId}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState icon="person-search" title="Aucun coach disponible" text="Aucune disponibilité publiée pour le moment." tone="muted" />
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    list: { padding: spacing.lg, paddingTop: 0, paddingBottom: 120 },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    sessionCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
      borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    coachName: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
    sessionMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  });
}
