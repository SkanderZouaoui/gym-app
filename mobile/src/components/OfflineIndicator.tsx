import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import { createMMKV } from 'react-native-mmkv';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  Easing, FadeIn, FadeOut, LinearTransition, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../i18n';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useNetworkStatusContext } from '../hooks/NetworkStatusContext';
import { haptics } from '../utils/haptics';

const EASE_OUT = Easing.bezier(0.32, 0.72, 0, 1);
const RESTORED_VISIBLE_MS = 2500;
const EXPANDED_VISIBLE_MS = 2000;
const EDGE_MARGIN = 14;
/** Hauteur réservée en bas de l'écran (barre d'onglets) : l'icône ne peut pas y être déposée. */
const BOTTOM_RESERVED = 110;
const POSITION_KEY = 'offline-indicator-position';

type Side = 'left' | 'right';
interface StoredPosition {
  side: Side;
  top: number;
}

const uiStorage = createMMKV({ id: 'muscleup-ui' });

function readStoredPosition(): StoredPosition | null {
  const raw = uiStorage.getString(POSITION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredPosition;
    return (parsed.side === 'left' || parsed.side === 'right') && Number.isFinite(parsed.top) ? parsed : null;
  } catch {
    return null;
  }
}

/** Indicateur réseau global, monté une seule fois à la racine et toujours au-dessus des écrans : une pastille
 * (icône « hors ligne » avec un point qui pulse) en haut à droite tant que l'appareil est hors ligne. À la
 * perte du réseau elle s'ouvre en capsule (texte + heure de la dernière synchronisation) puis revient à
 * l'icône après 2 s ; un appui la rouvre à tout moment. Au retour du réseau, elle devient brièvement verte.
 * Elle se déplace au doigt : à la fin du geste elle s'aimante au bord gauche ou droit, et sa position est mémorisée. */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { isOnline, lastSyncAt } = useNetworkStatusContext();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [mode, setMode] = useState<'hidden' | 'offline' | 'restored'>(isOnline ? 'hidden' : 'offline');
  const [expanded, setExpanded] = useState(false);
  const wasOffline = useRef(!isOnline);
  const appear = useSharedValue(isOnline ? 0 : 1);
  const pulse = useSharedValue(1);

  // Position : côté (aimanté) et distance au haut de l'écran, mémorisés ; tx/ty = déplacement en cours de geste.
  const minTop = Math.max(insets.top - 4, 8);
  const maxTop = Math.max(screenHeight - insets.bottom - BOTTOM_RESERVED, minTop);
  const clampTop = (v: number) => Math.min(Math.max(v, minTop), maxTop);
  const [side, setSide] = useState<Side>(() => readStoredPosition()?.side ?? 'right');
  const [storedTop, setTop] = useState<number | null>(() => readStoredPosition()?.top ?? null);
  const top = clampTop(storedTop ?? minTop);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sideSv = useSharedValue<number>(side === 'left' ? 0 : 1);
  const topSv = useSharedValue(top);
  const widthSv = useSharedValue(30);

  // Une fois la nouvelle position appliquée par React, le déplacement temporaire repasse à zéro (sans à-coup).
  useLayoutEffect(() => {
    tx.value = 0;
    ty.value = 0;
    sideSv.value = side === 'left' ? 0 : 1;
    topSv.value = top;
  }, [side, top, tx, ty, sideSv, topSv]);

  const commitPosition = (nextSide: Side, nextTop: number) => {
    uiStorage.set(POSITION_KEY, JSON.stringify({ side: nextSide, top: nextTop } satisfies StoredPosition));
    setSide(nextSide);
    setTop(nextTop);
  };

  const toggleExpanded = () => {
    void haptics.light();
    setExpanded((v) => !v);
  };

  const pan = usePanGesture({
    minDistance: 6,
    onUpdate: (e) => {
      'worklet';
      const w = widthSv.value;
      const room = screenWidth - 2 * EDGE_MARGIN - w;
      const baseX = sideSv.value === 0 ? 0 : room;
      tx.value = Math.min(Math.max(baseX + e.translationX, 0), room) - baseX;
      ty.value = Math.min(Math.max(topSv.value + e.translationY, minTop), maxTop) - topSv.value;
    },
    onDeactivate: () => {
      'worklet';
      const w = widthSv.value;
      const room = screenWidth - 2 * EDGE_MARGIN - w;
      const fromLeft = sideSv.value === 0;
      const x = (fromLeft ? 0 : room) + tx.value;
      const toLeft = x < room / 2;
      const nextTop = topSv.value + ty.value;
      const targetTx = toLeft ? (fromLeft ? 0 : -room) : (fromLeft ? room : 0);
      const targetTy = nextTop - topSv.value;
      tx.value = withSpring(targetTx, { damping: 20, stiffness: 220 });
      ty.value = withSpring(targetTy, { damping: 20, stiffness: 220 }, (finished) => {
        'worklet';
        if (finished) runOnJS(commitPosition)(toLeft ? 'left' : 'right', nextTop);
      });
    },
  });
  const tap = useTapGesture({
    maxDistance: 10,
    onActivate: () => {
      'worklet';
      runOnJS(toggleExpanded)();
    },
  });
  const gesture = useExclusiveGestures(pan, tap);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setMode('offline');
      setExpanded(true); // texte affiché à la perte du réseau, puis retour à l'icône après EXPANDED_VISIBLE_MS
      appear.value = withTiming(1, { duration: 320, easing: EASE_OUT });
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setExpanded(false);
    setMode('restored');
    void haptics.light();
    const timer = setTimeout(() => {
      appear.value = withTiming(0, { duration: 320, easing: EASE_OUT });
      setTimeout(() => setMode('hidden'), 340);
    }, RESTORED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [isOnline, appear]);

  useEffect(() => {
    if (mode !== 'offline' || reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withSequence(withTiming(0.25, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false);
  }, [mode, reduceMotion, pulse]);

  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => setExpanded(false), EXPANDED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [expanded]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value + (1 - appear.value) * -14 }, { scale: 0.9 + appear.value * 0.1 }],
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (mode === 'hidden') return null;

  const offline = mode === 'offline';
  const ink = offline ? colors.warningInk : colors.successInk;
  const bg = offline ? colors.warningSoft : colors.successSoft;
  const syncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString(dateLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;
  const title = offline ? t('common.hors_ligne') : t('common.connexion_retablie');
  const subtitle = offline ? (syncLabel ? t('common.donnees_du', { syncLabel }) : t('common.en_attente_de_la_premiere')) : null;
  const showLabel = !offline || expanded;

  return (
    <View pointerEvents="box-none" style={[styles.host, { top, alignItems: side === 'left' ? 'flex-start' : 'flex-end' }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={wrapStyle}
          onLayout={(e: LayoutChangeEvent) => { widthSv.value = e.nativeEvent.layout.width; }}
          accessible
          accessibilityRole={offline ? 'button' : 'alert'}
          accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
          onAccessibilityTap={offline ? toggleExpanded : undefined}
        >
          <Animated.View
            layout={reduceMotion ? undefined : LinearTransition.duration(260)}
            style={[styles.pill, { backgroundColor: bg, borderColor: `${ink}40`, shadowColor: ink }]}
          >
            <View>
              <MaterialIcons name={offline ? 'cloud-off' : 'cloud-done'} size={16} color={ink} />
              {offline ? <Animated.View style={[styles.dot, { backgroundColor: ink, borderColor: bg }, dotStyle]} /> : null}
            </View>
            {showLabel ? (
              <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.labels}>
                <Text style={[styles.title, { color: ink }]} numberOfLines={1}>{title}</Text>
                {subtitle ? <Text style={[styles.subtitle, { color: ink }]} numberOfLines={1}>{subtitle}</Text> : null}
              </Animated.View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function makeStyles(_colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    host: { position: 'absolute', left: 0, right: 0, paddingHorizontal: EDGE_MARGIN, zIndex: 9999, elevation: 9999 },
    pill: {
      minWidth: 30, height: 30, paddingHorizontal: 7, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth * 2,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6,
    },
    dot: { position: 'absolute', top: -3, right: -4, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
    labels: { paddingRight: 5 },
    title: { fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: 15 },
    subtitle: { fontFamily: fonts.body, fontSize: 11, lineHeight: 13, opacity: 0.85 },
  });
}
