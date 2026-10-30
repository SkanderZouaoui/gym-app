import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachSessions, useManualCheckin, useSessionRoster } from '../../../src/hooks/useCoachSessions';
import { EmptyState, ProgressBar, DetailSkeleton } from '../../../src/components/ui';
import { RosterRow } from '../../../src/components/coach/RosterRow';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../../../src/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';

/** Détail d'un cours + appel — FitZone App Coach.dc.html, I3. */
export default function CoachSessionDetailScreen() {
  const pullClient = useQueryClient();
  const { refreshing: pullRefreshing, onRefresh: pullOnRefresh } = useOfflineAwareRefresh(() => pullClient.invalidateQueries());
  const { t } = useTranslation();
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
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  const confirmed = roster?.filter((r) => r.status === 'CONFIRMED' || r.status === 'ATTENDED') ?? [];
  const waitlisted = roster?.filter((r) => r.status === 'WAITLISTED') ?? [];
  const attendedCount = confirmed.filter((r) => r.status === 'ATTENDED').length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={session.classType.name} fallbackHref="/(coach)" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={pullOnRefresh} />} contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>
          {new Date(session.startsAt).toLocaleString(dateLocale(), { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
          {session.room ? ` · ${session.room.name}` : ''}
        </Text>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{t('coach.presents')}</Text>
            <Text style={styles.progressValue}>{t('coach.inscrits_2', { attendedCount, length: confirmed.length })}</Text>
          </View>
          <ProgressBar progress={confirmed.length ? attendedCount / confirmed.length : 0} color={colors.success} />
        </View>

        <Text style={styles.sectionTitle}>{t('coach.inscrits_3')}</Text>
        {confirmed.length === 0 ? (
          <EmptyState icon="group-off" title={t('coach.aucun_inscrit')} text={t('coach.personne_nest_encore_reserve_pour')} tone="muted" />
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
            <Text style={styles.sectionTitle}>{t('common.liste_dattente')}</Text>
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
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 8,
    },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    progressValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.successInk },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    list: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
  });
}
