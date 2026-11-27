import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RefreshControl, StyleSheet, View, type RefreshControlProps } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeOut, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

/* Petit store global : tout RefreshControl en cours d'actualisation allume l'overlay unique monté à la racine.
   L'overlay ne s'éteint qu'à la fin du cycle d'animation en cours, même si le chargement finit avant. */
const CYCLE_MS = 2060;
let active = 0;
let shown = false;
let startedAt = 0;
/** Position verticale (fenêtre) de l'overlay ; null = sous la barre d'état. */
let overlayTop: number | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => shown;
const getTop = () => overlayTop;

function sync() {
  if (active > 0) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (!shown) { shown = true; startedAt = Date.now(); emit(); }
    return;
  }
  if (!shown || hideTimer) return;
  const elapsed = Date.now() - startedAt;
  const wait = CYCLE_MS - (elapsed % CYCLE_MS);
  hideTimer = setTimeout(() => { hideTimer = null; shown = false; emit(); }, wait);
}

/**
 * Remplace `RefreshControl` : le geste « tirer pour actualiser » reste natif, mais le loader standard
 * est masqué au profit de l'haltère animé (`GymRefreshOverlay`, monté une seule fois dans le layout racine).
 */
export function GymRefreshControl({ overlayTop: top, ...props }: RefreshControlProps & { overlayTop?: number }) {
  const refreshing = !!props.refreshing;
  // La liste reste « tirée vers le bas » tant que l'animation n'est pas finie, même si le chargement est terminé.
  const [hold, setHold] = useState(false);
  useEffect(() => subscribe(() => { if (!shown) setHold(false); }), []);
  useEffect(() => {
    if (!refreshing) return;
    setHold(true);
    overlayTop = top ?? null;
    active += 1;
    sync();
    return () => { active -= 1; sync(); };
  }, [refreshing, top]);
  return (
    <RefreshControl
      {...props}
      refreshing={refreshing || hold}
      tintColor="transparent"
      colors={['transparent']}
      progressBackgroundColor="transparent"
      style={[props.style, { backgroundColor: 'transparent' }]}
    />
  );
}

const LOGO_MARK = require('../../../assets/brand/logo-mark.png');
const LOGO_WORD = require('../../../assets/brand/logo-word.png');
const MARK_W = 80;
const MARK_H = Math.round((MARK_W * 139) / 406);
const WORD_H = Math.round((MARK_W * 38) / 406);

/**
 * Pour une page dont seule la liste se tire (en-tête fixe au-dessus) : mesure le haut de la liste afin que
 * le logo s'affiche dans la liste et non par-dessus l'en-tête. Poser `ref`/`onLayout` sur le conteneur de la liste
 * et passer `top` en `overlayTop` au `GymRefreshControl`.
 */
export function useRefreshOverlayTop() {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const [top, setTop] = useState<number | undefined>();
  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((_x, y) => setTop(Math.round(y) + 8));
  }, []);
  return { ref, onLayout, top };
}

/**
 * Apparition du logo Muscle UP (comme au lancement) pendant l'actualisation : le pictogramme glisse,
 * la barre se déploie, puis le nom remonte. L'animation boucle tant que l'actualisation dure.
 */
export function GymRefreshOverlay() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const customTop = useSyncExternalStore(subscribe, getTop, getTop);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) { progress.value = 0; return; }
    if (reduced) { progress.value = 0.9; return; }
    progress.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1300, easing: Easing.linear }),
        withDelay(400, withTiming(1, { duration: 350, easing: Easing.in(Easing.cubic) })),
        withTiming(0, { duration: 1 }),
      ),
      -1,
    );
  }, [visible, reduced, progress]);

  // Sortie : le pictogramme file vers la droite, la barre se rétracte, le nom redescend, le tout en s'effaçant.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.9, 1], [1, 0], 'clamp'),
    transform: [{ scale: interpolate(progress.value, [0.9, 1], [1, 0.85], 'clamp') }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.27], [0, 1], 'clamp'),
    transform: [{ translateX: interpolate(progress.value, [0, 0.27, 0.9, 1], [-18, 0, 0, 22], 'clamp') }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(progress.value, [0.27, 0.5, 0.9, 1], [0, 1, 1, 0], 'clamp') }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0.5, 0.75, 0.9, 1], [WORD_H + 2, 0, 0, WORD_H + 2], 'clamp') }],
  }));

  if (!visible) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: customTop ?? insets.top + 8 }]}>
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(180)}
        style={styles.card}
      >
        <Animated.View style={[styles.content, contentStyle]}>
          <Animated.Image source={LOGO_MARK} style={[{ width: MARK_W, height: MARK_H, tintColor: colors.text }, markStyle]} resizeMode="contain" />
          <Animated.View style={[styles.bar, { backgroundColor: colors.text }, barStyle]} />
          <View style={styles.wordMask}>
            <Animated.Image source={LOGO_WORD} style={[{ width: MARK_W, height: WORD_H, tintColor: colors.text }, wordStyle]} resizeMode="contain" />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  card: { alignItems: 'center' },
  content: { alignItems: 'center', gap: 5 },
  bar: { width: MARK_W, height: 3, borderRadius: 2 },
  wordMask: { width: MARK_W, height: WORD_H, overflow: 'hidden' },
});
