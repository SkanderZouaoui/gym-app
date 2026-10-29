import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { TrainingTabs, type TrainingTab } from '../../../src/components/training/TrainingTabs';
import { ProgramsView } from '../../../src/components/training/views/ProgramsView';
import { ExercisesView } from '../../../src/components/training/views/ExercisesView';
import { HistoryView } from '../../../src/components/training/views/HistoryView';
import { OfflineBanner, ScreenTitle } from '../../../src/components/ui';
import { useNetworkStatusContext } from '../../../src/hooks/NetworkStatusContext';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useQueryClient } from '@tanstack/react-query';

/** Onglet Entraînement — FitZone App Entraînement.dc.html (D1/E1/F1). */
export default function TrainingScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  const [tab, setTab] = useState<TrainingTab>('proposed');
  const { isOnline, lastSyncAt } = useNetworkStatusContext();
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => queryClient.invalidateQueries());

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {!isOnline ? (
        <View style={styles.offlineBannerWrap}>
          <OfflineBanner lastSyncAt={lastSyncAt} />
        </View>
      ) : null}
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenTitle title={t('training.title')} />

        <TrainingTabs value={tab} onChange={setTab} />

        {tab === 'history' ? <HistoryView /> : tab === 'exercises' ? <ExercisesView /> : <ProgramsView source={tab === 'proposed' ? 'proposed' : 'mine'} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    offlineBannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  });
}
