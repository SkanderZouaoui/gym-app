import { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useNow } from '../hooks/useNow';
import { useActiveSessionDraft, type SessionDraft } from '../hooks/useSessionDraft';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useTabBarStore } from '../store/tabBar';
import { BAR_HEIGHT } from './FloatingTabBar';

const EASE_OUT = Easing.bezier(0.32, 0.72, 0, 1);

/** Écrans de la barre d'onglets Adhérent : la bannière se place au-dessus de la barre flottante. */
const TAB_PATHS = new Set(['/', '/planning', '/training', '/progress', '/profile', '/qr']);

function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Bannière persistante « séance en cours » : visible sur tous les écrans Adhérent tant qu'une séance
 * n'est ni terminée ni abandonnée ; le chrono part de l'heure de début réelle, il continue donc hors de
 * l'écran de la séance. Un appui ramène à la séance. */
export function ActiveSessionBanner() {
  const pathname = usePathname();
  const draft = useActiveSessionDraft();
  if (!draft) return null;
  if (pathname.startsWith('/session/live') || pathname.startsWith('/session/summary')) return null;
  return <ActiveSessionBannerCard draft={draft} pathname={pathname} />;
}

function ActiveSessionBannerCard({ draft, pathname }: { draft: SessionDraft; pathname: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nowMs = useNow(1000);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const keyboardHeight = useKeyboardHeight();
  const tabBarHidden = useTabBarStore((st) => st.hidden || st.suppressed > 0);
  const bottomInset = Platform.OS === 'android' ? 0 : insets.bottom;
  const lowBottom = Math.max(bottomInset, 12) + 8;
  // Au-dessus de la barre flottante tant qu'elle est visible ; elle prend sa place dès qu'elle se replie (scroll, clavier).
  const aboveBar = TAB_PATHS.has(pathname) && !tabBarHidden && keyboardHeight === 0;
  const targetBottom = aboveBar ? BAR_HEIGHT + Math.max(bottomInset - 6, 10) + 10 : lowBottom;
  const bottom = useSharedValue(targetBottom);
  useEffect(() => {
    bottom.value = withTiming(targetBottom, { duration: 450, easing: EASE_OUT });
  }, [targetBottom, bottom]);
  const wrapStyle = useAnimatedStyle(() => ({ bottom: bottom.value }));

  const removed = new Set(draft.removedExerciseIds);
  const active = draft.sets.filter((s) => !removed.has(s.exerciseId));
  const done = active.filter((s) => s.done).length;
  const elapsed = Math.floor((nowMs - draft.startedAt) / 1000);

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, wrapStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${draft.programName ?? t('member.seance_en_cours')}, ${t('member.seance_en_cours')} ${formatElapsed(elapsed)}`}
        onPress={() => router.navigate(`/(member)/session/live/${draft.programId}/${draft.dayId}?resume=1` as any)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
      >
        <View style={styles.iconCircle}>
          <MaterialIcons name="fitness-center" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{draft.programName ?? t('member.seance_en_cours')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {t('member.seance_en_cours_progression', { done, total: active.length })}
          </Text>
        </View>
        <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
        <MaterialIcons name="chevron-right" size={22} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { position: 'absolute', left: 16, right: 16 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 20, backgroundColor: colors.primary,
      shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
    },
    iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: fonts.headSemiBold, fontSize: 14.5, color: '#FFFFFF' },
    subtitle: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(255,255,255,0.85)' },
    timer: { fontFamily: fonts.headSemiBold, fontSize: 15, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  });
}
