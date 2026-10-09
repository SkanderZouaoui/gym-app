import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachSessions, useManualCheckin, useSessionRoster } from '../../../src/hooks/useCoachSessions';
import { EmptyState, ProgressBar } from '../../../src/components/ui';
import { RosterRow } from '../../../src/components/coach/RosterRow';

/** Détail d'un cours + appel — FitZone App Coach.dc.html, I3. */
export default function CoachSessionDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: sessions } = useCoachSessions();
  const { data: roster, isLoading } = useSessionRoster(id);
  const checkin = useManualCheckin();

  const session = sessions?.find((s) => s.id === id);

  if (isLoading || !session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const confirmed = roster?.filter((r) => r.status === 'CONFIRMED' || r.status === 'ATTENDED') ?? [];
  const waitlisted = roster?.filter((r) => r.status === 'WAITLISTED') ?? [];
  const attendedCount = confirmed.filter((r) => r.status === 'ATTENDED').length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={session.classType.name} fallbackHref="/(coach)" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>
          {new Date(session.startsAt).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
          {session.room ? ` · ${session.room.name}` : ''}
        </Text>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Présents</Text>
            <Text style={styles.progressValue}>{attendedCount} / {confirmed.length} inscrits</Text>
          </View>
          <ProgressBar progress={confirmed.length ? attendedCount / confirmed.length : 0} color={colors.success} />
        </View>

        <Text style={styles.sectionTitle}>Inscrits</Text>
        {confirmed.length === 0 ? (
          <EmptyState icon="group-off" title="Aucun inscrit" text="Personne n'est encore réservé pour ce cours." tone="muted" />
        ) : (
          <View style={styles.list}>
            {confirmed.map((entry) => (
              <RosterRow
                key={entry.id}
                firstName={entry.user.firstName}
                lastName={entry.user.lastName}
                attended={entry.status === 'ATTENDED'}
                waitlistPosition={null}
                checkingIn={checkin.isPending}
                onCheckIn={() => checkin.mutate({ sessionId: session.id, userId: entry.user.id })}
              />
            ))}
          </View>
        )}

        {waitlisted.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Liste d’attente</Text>
            <View style={styles.list}>
              {waitlisted.map((entry) => (
                <RosterRow
                  key={entry.id}
                  firstName={entry.user.firstName}
                  lastName={entry.user.lastName}
                  attended={false}
                  waitlistPosition={entry.waitlistPosition}
                  checkingIn={checkin.isPending}
                  onCheckIn={() => checkin.mutate({ sessionId: session.id, userId: entry.user.id })}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    subtitle: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted },
    progressCard: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 8,
    },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    progressValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.successInk },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    list: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
  });
}
