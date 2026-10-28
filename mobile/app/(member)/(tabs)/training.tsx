import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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

/** Onglet Entraînement — FitZone App Entraînement.dc.html (D1/E1/F1). */
export default function TrainingScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  const [tab, setTab] = useState<TrainingTab>('programs');
  const { isOnline, lastSyncAt } = useNetworkStatusContext();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {!isOnline ? (
        <View style={styles.offlineBannerWrap}>
          <OfflineBanner lastSyncAt={lastSyncAt} />
        </View>
      ) : null}
      <ScrollView {...tabBarScroll} contentContainerStyle={styles.container}>
        <ScreenTitle title={t('training.title')} />

        <TrainingTabs value={tab} onChange={setTab} />

        {tab === 'history' ? <HistoryView /> : tab === 'exercises' ? <ExercisesView /> : <ProgramsView />}
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
