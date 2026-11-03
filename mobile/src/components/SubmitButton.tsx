import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing, FadeIn, FadeOut, interpolate, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { fonts } from '../theme/tokens';
import { haptics } from '../utils/haptics';

export type SubmitStatus = 'idle' | 'loading' | 'success';

interface SubmitButtonProps {
  label: string;
  loadingLabel?: string;
  successLabel?: string;
  status: SubmitStatus;
  onPress: () => void;
  disabled?: boolean;
  /** Icône à droite du libellé à l'état normal. */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Dégradé du bouton. */
  colors: [string, string];
  /** Couleur de la lueur sous le bouton et de l'anneau de réussite. */
  glowColor: string;
  height?: number;
  radius?: number;
  fontSize?: number;
  /** À incrémenter pour déclencher le retour d'échec (teinte rouge discrète, léger tremblement, haptique). */
  shakeTrigger?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const EASE = Easing.bezier(0.32, 0.72, 0, 1);
/** Longueur du tracé de la coche (2 segments), pour l'animation du trait. */
const CHECK_LENGTH = 24;
const ERROR_COLORS: [string, string] = ['#EF4444', '#DC2626'];

/** Bouton d'envoi animé, dans l'esprit de l'app (violet, verre, mouvements doux) :
 * - chargement : spinner fin et liseré lumineux qui glisse le long du bord bas ;
 * - succès : le bouton se resserre en cercle (même dégradé, pas de changement de couleur), la coche se trace,
 *   un anneau fin se dissipe et la lueur respire une fois, avec un retour haptique ;
 * - échec : voile rouge discret et léger tremblement amorti.
 * « Réduire les animations » remplace tout cela par de simples fondus. */
export function SubmitButton({
  label, loadingLabel, status, onPress, disabled, icon, colors, glowColor,
  height = 56, radius = 18, fontSize = 16, shakeTrigger = 0,
}: SubmitButtonProps) {
  const reduceMotion = useReducedMotion();
  const [fullWidth, setFullWidth] = useState(0);
  const press = useSharedValue(1);
  const shake = useSharedValue(0);
  const morph = useSharedValue(0);
  const check = useSharedValue(0);
  const ring = useSharedValue(0);
  const glow = useSharedValue(0);
  const spin = useSharedValue(0);
  const sweep = useSharedValue(0);
  const errorTint = useSharedValue(0);
  const previousStatus = useRef<SubmitStatus>(status);
  const previousShake = useRef(shakeTrigger);

  useEffect(() => {
    const was = previousStatus.current;
    previousStatus.current = status;

    if (status === 'success' && was !== 'success') {
      void haptics.success();
      morph.value = withTiming(1, { duration: reduceMotion ? 0 : 460, easing: EASE });
      check.value = withDelay(reduceMotion ? 0 : 280, withTiming(1, { duration: reduceMotion ? 0 : 380, easing: Easing.out(Easing.cubic) }));
      if (!reduceMotion) {
        ring.value = 0;
        ring.value = withDelay(340, withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) }));
        glow.value = withSequence(withTiming(1, { duration: 380 }), withTiming(0.35, { duration: 700 }));
      }
    } else if (status !== 'success') {
      morph.value = withTiming(0, { duration: reduceMotion ? 0 : 320, easing: EASE });
      check.value = withTiming(0, { duration: 140 });
      glow.value = withTiming(0, { duration: 300 });
    }

    if (status === 'loading' && !reduceMotion) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.linear }), -1, false);
      sweep.value = 0;
      sweep.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }), -1, false);
    } else {
      spin.value = 0;
      sweep.value = 0;
    }
  }, [status, reduceMotion, morph, check, ring, glow, spin, sweep]);

  useEffect(() => {
    if (shakeTrigger === previousShake.current) return;
    previousShake.current = shakeTrigger;
    void haptics.error();
    errorTint.value = withSequence(withTiming(reduceMotion ? 0.9 : 0.85, { duration: 160 }), withTiming(0, { duration: 650 }));
    if (reduceMotion) return;
    shake.value = withSequence(
      withTiming(-6, { duration: 60 }), withTiming(5, { duration: 70 }), withTiming(-3.5, { duration: 70 }),
      withTiming(2, { duration: 60 }), withTiming(0, { duration: 60 }),
    );
  }, [shakeTrigger, reduceMotion, shake, errorTint]);

  const circle = height;
  const containerStyle = useAnimatedStyle(() => ({
    ...(fullWidth > 0 ? { width: interpolate(morph.value, [0, 1], [fullWidth, circle]) } : {}),
    transform: [{ translateX: shake.value }, { scale: press.value }],
    shadowOpacity: 0.34 + glow.value * 0.2,
    shadowRadius: 14 + glow.value * 10,
  }));
  const clipStyle = useAnimatedStyle(() => ({ borderRadius: interpolate(morph.value, [0, 1], [radius, circle / 2]) }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.15, 1], [0, 0.55, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 1.9]) }],
  }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: status === 'loading' ? 1 : 0,
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-fullWidth * 0.45, fullWidth]) }],
  }));
  const errorStyle = useAnimatedStyle(() => ({ opacity: errorTint.value }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - check.value) }));

  const off = disabled || status !== 'idle';
  const text = status === 'loading' ? (loadingLabel ?? label) : label;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setFullWidth(e.nativeEvent.layout.width)} style={{ alignItems: 'center' }}>
      <Animated.View
        style={[
          { width: '100%', height, shadowColor: glowColor, shadowOffset: { width: 0, height: 10 } },
          containerStyle,
          disabled && { shadowOpacity: 0, elevation: 0 },
          !disabled && { elevation: 8 },
        ]}
      >
        <Pressable
          onPress={onPress}
          disabled={off}
          onPressIn={() => { press.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
          onPressOut={() => { press.value = withSpring(1, { damping: 14, stiffness: 240 }); }}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!disabled, busy: status === 'loading' }}
          accessibilityLabel={text}
          style={{ height }}
        >
          <Animated.View style={[StyleSheet.absoluteFill, styles.clip, clipStyle]} pointerEvents="none">
            <LinearGradient colors={disabled ? ['#8E86A8', '#8E86A8'] : colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} />
            <Animated.View style={[StyleSheet.absoluteFill, errorStyle]}>
              <LinearGradient colors={ERROR_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            {!reduceMotion ? (
              <Animated.View style={[styles.sweep, { width: Math.max(fullWidth * 0.4, 1) }, sweepStyle]}>
                <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            ) : null}
          </Animated.View>

          <View style={styles.center} pointerEvents="none">
            <Animated.View
              key={status}
              entering={FadeIn.duration(status === 'success' ? 200 : 170).delay(status === 'success' ? 200 : 0)}
              exiting={FadeOut.duration(90)}
              style={styles.row}
            >
              {status === 'loading' ? <Animated.View style={[styles.spinner, spinStyle]} /> : null}
              {status === 'success' ? (
                <Svg width={32} height={32} viewBox="0 0 32 32">
                  <AnimatedPath
                    d="M8 16.5 L14 22 L24 10"
                    stroke="#FFFFFF"
                    strokeWidth={3.2}
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

        {!reduceMotion ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.ring, { width: circle, height: circle, borderRadius: circle / 2, marginLeft: -circle / 2, borderColor: glowColor }, ringStyle]}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontFamily: fonts.bodyBold, letterSpacing: 0.3, color: '#FFFFFF' },
  spinner: { width: 20, height: 20, borderRadius: 10, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.28)', borderTopColor: '#FFFFFF' },
  sweep: { position: 'absolute', left: 0, bottom: 0, height: 2.5 },
  ring: { position: 'absolute', top: 0, left: '50%', borderWidth: 1.5 },
});
