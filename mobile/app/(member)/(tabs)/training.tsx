import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { TrainingTabs, type TrainingTab } from '../../../src/components/training/TrainingTabs';
import { ProgramsView } from '../../../src/components/training/views/ProgramsView';
import { HistoryView } from '../../../src/components/training/views/HistoryView';
import { ProgressView } from '../../../src/components/training/views/ProgressView';
import { OfflineBanner } from '../../../src/components/ui';
import { useNetworkStatusContext } from '../../../src/hooks/NetworkStatusContext';

/** Onglet Entraînement — FitZone App Entraînement.dc.html (D1/E1/F1). */
export default function TrainingScreen() {
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('training.title')}</Text>
          {tab === 'progress' ? (
            <Pressable style={styles.measureButton} onPress={() => router.push('/(member)/measure')}>
              <MaterialIcons name="add" size={18} color={colors.primaryContrast} />
              <Text style={styles.measureButtonText}>{t('training.measure')}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.measureButton} onPress={() => router.push('/(member)/exercises')}>
              <MaterialIcons name="menu-book" size={18} color={colors.primaryContrast} />
              <Text style={styles.measureButtonText}>{t('training.library')}</Text>
            </Pressable>
          )}
        </View>

        <TrainingTabs value={tab} onChange={setTab} />

        {tab === 'programs' ? <ProgramsView /> : tab === 'history' ? <HistoryView /> : <ProgressView />}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    offlineBannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    headerRow: { flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: fonts.head, fontSize: 28, color: colors.text },
    measureButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
      borderRadius: 999, backgroundColor: colors.primary,
    },
    measureButtonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryContrast },
  });
}
