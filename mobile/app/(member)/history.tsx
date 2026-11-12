import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { HistoryView } from '../../src/components/training/views/HistoryView';
import { Toast } from '../../src/components/ui';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { useMyBookings } from '../../src/hooks/useMe';
import { useMyWorkouts } from '../../src/hooks/useCoaching';

/** Écran Historique (accès depuis Activité et Objectif) : même contenu que l'onglet Historique de l'Entraînement. */
export default function HistoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({ safeArea: { flex: 1, backgroundColor: colors.bg }, container: { padding: spacing.lg, paddingTop: 4, paddingBottom: 80 } }), [colors]);
  const { refetch: refetchWorkouts } = useMyWorkouts();
  const { refetch: refetchBookings } = useMyBookings();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetchWorkouts(), refetchBookings()]));
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={t('member.history_title')} fallbackHref="/(member)/activity" />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <HistoryView />
      </ScrollView>
      {offlineToastVisible ? <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} /> : null}
    </SafeAreaView>
  );
}
