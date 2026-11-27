import { SyncStatusCard } from '../../../src/components/SyncStatusCard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { GymRefreshControl } from '../../../src/components/ui/GymRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { TrainingTabs, TRAINING_TAB_ORDER, type TrainingTab } from '../../../src/components/training/TrainingTabs';
import { ProgramsView } from '../../../src/components/training/views/ProgramsView';
import { ExercisesView } from '../../../src/components/training/views/ExercisesView';
import { HistoryView } from '../../../src/components/training/views/HistoryView';
import { ScreenTitle } from '../../../src/components/ui';
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
  const direction = useRef<1 | -1>(1);
  /** Passe à l'onglet suivant (+1) ou précédent (-1), en boucle. */
  const shift = useCallback((delta: 1 | -1) => {
    direction.current = delta;
    setTab((current) => {
      const i = TRAINING_TAB_ORDER.indexOf(current);
      return TRAINING_TAB_ORDER[(i + delta + TRAINING_TAB_ORDER.length) % TRAINING_TAB_ORDER.length];
    });
  }, []);
  const changeTab = useCallback((next: TrainingTab) => {
    direction.current = TRAINING_TAB_ORDER.indexOf(next) >= TRAINING_TAB_ORDER.indexOf(tab) ? 1 : -1;
    setTab(next);
  }, [tab]);
  // Le contenu suit le doigt, sort de l'écran puis le nouvel onglet arrive du côté opposé (ressort).
  const { width: screenWidth } = useWindowDimensions();
  const tx = useSharedValue(0);
  const fade = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    tx.value = direction.current * screenWidth * 0.35;
    fade.value = 0;
    tx.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.9 });
    fade.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [tab, screenWidth, tx, fade]);
  const swipe = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    onUpdate: (e) => {
      'worklet';
      tx.value = e.translationX * 0.85;
      fade.value = 1 - Math.min(Math.abs(e.translationX) / (screenWidth * 0.8), 0.6);
    },
    onDeactivate: (e) => {
      'worklet';
      const far = Math.abs(e.translationX) > 70 || Math.abs(e.velocityX) > 600;
      if (!far) {
        tx.value = withSpring(0, { damping: 22, stiffness: 260 });
        fade.value = withTiming(1, { duration: 160 });
        return;
      }
      // Glisser vers la gauche → onglet suivant (inversé en arabe).
      const toNext = (e.translationX < 0) !== isRtl;
      const sign = e.translationX < 0 ? -1 : 1;
      fade.value = withTiming(0, { duration: 140 });
      tx.value = withTiming(sign * screenWidth * 0.5, { duration: 150, easing: Easing.in(Easing.quad) }, (finished) => {
        'worklet';
        if (finished) runOnJS(shift)(toNext ? 1 : -1);
        else { tx.value = withSpring(0); fade.value = withTiming(1, { duration: 160 }); }
      });
    },
  });
  const contentStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateX: tx.value }] }));
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => queryClient.invalidateQueries());

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<GymRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenTitle title={t('training.title')} />
        <SyncStatusCard />

        <TrainingTabs value={tab} onChange={changeTab} />

        <GestureDetector gesture={swipe}>
          <Animated.View style={[styles.swipeArea, contentStyle]}>
            {tab === 'history' ? <HistoryView /> : tab === 'exercises' ? <ExercisesView /> : <ProgramsView source={tab === 'proposed' ? 'proposed' : 'mine'} />}
          </Animated.View>
        </GestureDetector>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    offlineBannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    swipeArea: { minHeight: 480, gap: spacing.md },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  });
}
