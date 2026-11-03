import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { ProgressView } from '../../../src/components/training/views/ProgressView';
import { ScreenTitle } from '../../../src/components/ui';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useQueryClient } from '@tanstack/react-query';

/** Onglet Progrès : mesures corporelles, régularité et série — v2. */
export default function ProgressScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => queryClient.invalidateQueries());

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenTitle
          title={t('progress.title')}
          right={
            <Pressable style={styles.measureButton} onPress={() => router.push('/(member)/measure')}>
              <MaterialIcons name="add" size={18} color={colors.primaryContrast} />
              <Text style={styles.measureButtonText}>{t('training.measure')}</Text>
            </Pressable>
          }
        />
        <ProgressView />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    offlineBannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    measureButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
      borderRadius: 999, backgroundColor: colors.primary, marginBottom: 6,
    },
    measureButtonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryContrast },
  });
}
