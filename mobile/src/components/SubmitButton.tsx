import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing, FadeIn, FadeOut, ZoomIn, interpolate, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { haptics } from '../utils/haptics';

export type SubmitStatus = 'idle' | 'loading' | 'success' | 'error' | 'locked';

interface SubmitButtonProps {
  label: string;
  loadingLabel?: string;
  /** Libellé de l'état d'échec (ex. « Identifiants incorrects »). */
  errorLabel?: string;
  /** Libellé de l'état bloqué (ex. « Réessaie dans 0:30 »). */
  lockedLabel?: string;
  status: SubmitStatus;
  onPress: () => void;
  /** Grisé et inactif sans changer de libellé (ex. compte désactivé). */
  disabled?: boolean;
  /** Icône à droite du libellé à l'état normal. */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Dégradé vertical du bouton à l'état normal. */
  colors: [string, string];
  /** Couleur de la lueur sous le bouton à l'état normal. */
  glowColor: string;
  height?: number;
  radius?: number;
  fontSize?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const MORPH_EASE = Easing.bezier(0.7, 0, 0.2, 1);
const SUCCESS = '#16A34A';
const DANGER = '#EF4444';
/** Longueur du tracé de la coche (2 segments), pour l'animation du trait. */
const CHECK_LENGTH = 30;

/** Bouton d'envoi — maquette « Feedback & états », bloc 01 « Bouton de connexion » :
 * - repos : dégradé violet, lueur, barre « de traction » sous le bouton ;
 * - chargement : spinner et libellé « en cours » ;
 * - succès : le bouton se réduit en cercle vert, saute par-dessus la barre qui s'éclaire, la coche se dessine ;
 * - échec : rouge, icône et message court, secousse ;
 * - bloqué : gris, compte à rebours, aucun appui possible.
 * « Réduire les animations » remplace les mouvements par de simples fondus. */
export function SubmitButton({
  label, loadingLabel, errorLabel, lockedLabel, status, onPress, disabled, icon, colors, glowColor,
  height = 56, radius = 18, fontSize = 16,
}: SubmitButtonProps) {
  const reduceMotion = useReducedMotion();
  const { scheme } = useTheme();
  const [fullWidth, setFullWidth] = useState(0);
  const press = useSharedValue(1);
  const shake = useSharedValue(0);
  const jumpY = useSharedValue(0);
  const jumpSx = useSharedValue(1);
  const jumpSy = useSharedValue(1);
  const morph = useSharedValue(0);
  const successLayer = useSharedValue(0);
  const errorLayer = useSharedValue(0);
  const lockedLayer = useSharedValue(0);
  const check = useSharedValue(0);
  const spin = useSharedValue(0);
  const previousStatus = useRef<SubmitStatus>(status);

  const lockedColor = scheme === 'dark' ? '#4B4468' : '#9A93B5';
  const isGray = status === 'locked' || !!disabled;

  useEffect(() => {
    const was = previousStatus.current;
    previousStatus.current = status;
    const fade = reduceMotion ? 0 : 300;

    successLayer.value = withTiming(status === 'success' ? 1 : 0, { duration: fade });
    errorLayer.value = withTiming(status === 'error' ? 1 : 0, { duration: fade });
    lockedLayer.value = withTiming(status === 'locked' ? 1 : 0, { duration: fade });
    morph.value = withTiming(status === 'success' ? 1 : 0, { duration: reduceMotion ? 0 : 450, easing: MORPH_EASE });

    if (status === 'success' && was !== 'success') {
      void haptics.success();
      check.value = withDelay(reduceMotion ? 0 : 150, withTiming(1, { duration: reduceMotion ? 0 : 450, easing: Easing.out(Easing.quad) }));
      if (!reduceMotion) {
        const ease = Easing.bezier(0.3, 0.7, 0.4, 1);
        const step = (to: number, duration: number) => withTiming(to, { duration, easing: ease });
        jumpY.value = withSequence(step(4, 188), step(-34, 225), step(0, 187), step(0, 150));
        jumpSx.value = withSequence(step(1.08, 188), step(0.95, 225), step(1.06, 187), step(1, 150));
        jumpSy.value = withSequence(step(0.92, 188), step(1.05, 225), step(0.94, 187), step(1, 150));
      }
    } else if (status !== 'success') {
      check.value = 0;
    }

    if (status === 'error' && was !== 'error') {
      void haptics.error();
      if (!reduceMotion) {
        shake.value = withSequence(
          withTiming(-9, { duration: 100 }), withTiming(8, { duration: 100 }), withTiming(-5, { duration: 100 }),
          withTiming(3, { duration: 100 }), withTiming(0, { duration: 100 }),
        );
      }
    }

    if (status === 'loading' && !reduceMotion) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.linear }), -1, false);
    } else {
      spin.value = 0;
    }
  }, [status, reduceMotion, successLayer, errorLayer, lockedLayer, morph, check, jumpY, jumpSx, jumpSy, shake, spin]);

  const circle = height;
  const containerStyle = useAnimatedStyle(() => ({
    ...(fullWidth > 0 ? { width: interpolate(morph.value, [0, 1], [fullWidth, circle]) } : {}),
    transform: [
      { translateX: shake.value },
      { translateY: jumpY.value },
      { scaleX: jumpSx.value * press.value },
      { scaleY: jumpSy.value * press.value },
    ],
  }));
  const clipStyle = useAnimatedStyle(() => ({ borderRadius: interpolate(morph.value, [0, 1], [radius, circle / 2]) }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - check.value) }));
  const successStyle = useAnimatedStyle(() => ({ opacity: successLayer.value }));
  const errorStyle = useAnimatedStyle(() => ({ opacity: errorLayer.value }));
  const lockedStyle = useAnimatedStyle(() => ({ opacity: lockedLayer.value }));

  const shadowColor =
    status === 'success' ? 'rgba(22,163,74,0.5)' : status === 'error' ? 'rgba(239,68,68,0.45)' : isGray ? 'transparent' : glowColor;
  const off = status !== 'idle' || !!disabled;
  const text = status === 'loading' ? (loadingLabel ?? label) : status === 'error' ? (errorLabel ?? label) : status === 'locked' ? (lockedLabel ?? label) : label;
  const barColor = status === 'success' ? '#FFFFFF' : 'rgba(124,58,237,0.55)';

  return (
    <View onLayout={(e: LayoutChangeEvent) => setFullWidth(e.nativeEvent.layout.width)} style={{ alignItems: 'center', marginBottom: 12 }}>
      <View
        pointerEvents="none"
        style={[
          styles.bar,
          { backgroundColor: barColor },
          status === 'success' && { shadowColor: '#FFFFFF', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
        ]}
      />
      <Animated.View
        style={[
          { width: '100%', height, shadowColor, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: isGray ? 0 : 8 },
          containerStyle,
        ]}
      >
        <Pressable
          onPress={onPress}
          disabled={off}
          onPressIn={() => { press.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
          onPressOut={() => { press.value = withSpring(1, { damping: 14, stiffness: 240 }); }}
          accessibilityRole="button"
          accessibilityState={{ disabled: off, busy: status === 'loading' }}
          accessibilityLabel={text}
          style={{ height }}
        >
          <Animated.View style={[StyleSheet.absoluteFill, styles.clip, clipStyle]} pointerEvents="none">
            <LinearGradient colors={colors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SUCCESS }, successStyle]} />
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: DANGER }, errorStyle]} />
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: lockedColor }, lockedStyle]} />
            {disabled && status === 'idle' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: lockedColor }]} /> : null}
          </Animated.View>

          <View style={styles.center} pointerEvents="none">
            <Animated.View
              key={status}
              entering={status === 'idle' ? undefined : status === 'success' ? ZoomIn.springify().damping(11).delay(80) : FadeIn.duration(status === 'error' ? 300 : 170)}
              exiting={FadeOut.duration(90)}
              style={styles.row}
            >
              {status === 'loading' ? <Animated.View style={[styles.spinner, spinStyle]} /> : null}
              {status === 'error' ? <MaterialIcons name="error" size={24} color="#FFFFFF" /> : null}
              {status === 'locked' ? <MaterialIcons name="lock-clock" size={22} color="#FFFFFF" /> : null}
              {status === 'success' ? (
                <Svg width={30} height={30} viewBox="0 0 30 30">
                  <AnimatedPath
                    d="M7 16 L13 22 L23 9"
                    stroke="#FFFFFF"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={CHECK_LENGTH}
                    animatedProps={checkProps}
                  />
                </Svg>
              ) : (
                <Text style={[styles.label, { fontSize }]} numberOfLines={1}>{text}</Text>
              )}
              {status === 'idle' && icon ? <MaterialIcons name={icon} size={fontSize + 5} color="#FFFFFF" /> : null}
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontFamily: fonts.bodyBold, color: '#FFFFFF' },
  spinner: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#FFFFFF' },
  bar: { position: 'absolute', left: -6, right: -6, bottom: -9, height: 5, borderRadius: 3 },
});
