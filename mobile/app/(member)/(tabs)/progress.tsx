import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { GymRefreshControl } from '../../../src/components/ui/GymRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
        refreshControl={<GymRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenTitle
          title={t('progress.title')}
          right={
            <Pressable style={({ pressed }) => [styles.measureButton, pressed && { transform: [{ scale: 0.97 }] }]} onPress={() => router.push('/(member)/measure')}>
              <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
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
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, overflow: 'hidden',
      borderRadius: 999, backgroundColor: colors.hero, marginBottom: 6,
      shadowColor: colors.hero2, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    measureButtonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryContrast },
  });
}
