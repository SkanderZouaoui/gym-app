import { useEffect, useState } from 'react';
import { Animated as RNAnimated, Easing as RNEasing, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

/** Squelette — maquette « Feedback & états », « Chargement » : un reflet violet clair traverse le bloc pendant la
 * récupération des données (sans reflet si « réduire les animations » est actif). */
export function SkeletonBlock({ height, width, radius = radii.md, style }: { height: number; width?: number | `${number}%`; radius?: number; style?: ViewStyle }) {
  const { scheme } = useTheme();
  const dark = scheme === 'dark';
  const reduceMotion = useReducedMotion();
  const [blockWidth, setBlockWidth] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
  }, [reduceMotion, sweep]);

  const bandWidth = Math.max(blockWidth * 0.6, 1);
  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-bandWidth, blockWidth]) }],
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setBlockWidth(e.nativeEvent.layout.width)}
      style={[{ height, width: width ?? '100%', borderRadius: radius, backgroundColor: dark ? '#1A1431' : '#E8E3F5', overflow: 'hidden' }, style]}
    >
      {!reduceMotion ? (
        <Animated.View style={[StyleSheet.absoluteFill, { width: bandWidth }, bandStyle]}>
          <LinearGradient
            colors={dark ? ['rgba(58,45,102,0)', '#3A2D66', 'rgba(58,45,102,0)'] : ['rgba(248,246,253,0)', '#F8F6FD', 'rgba(248,246,253,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function SkeletonGroup({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return <View style={[styles.group, { gap }]} accessibilityState={{ busy: true }}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {},
});

/** Squelette d'une ligne de liste : carte avec pastille et deux lignes de texte qui pulsent. */
export function SkeletonRow({ height = 72 }: { height?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: height, padding: 14, borderRadius: radii.xl,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      }}
    >
      <SkeletonBlock height={44} width={44} radius={14} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock height={14} width="62%" radius={7} />
        <SkeletonBlock height={11} width="38%" radius={6} />
      </View>
    </View>
  );
}

/** Squelette de liste : plusieurs lignes empilées, à afficher à la place d'un état vide pendant le chargement. */
export function SkeletonList({ count = 4, height }: { count?: number; height?: number }) {
  return (
    <SkeletonGroup gap={10}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} height={height} />
      ))}
    </SkeletonGroup>
  );
}

/** Squelette d'une page de détail : grand bloc d'en-tête puis quelques lignes. À afficher pendant le chargement d'une fiche. */
export function DetailSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 14 }} accessibilityState={{ busy: true }}>
      <SkeletonBlock height={26} width="40%" radius={10} />
      <SkeletonBlock height={150} radius={28} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SkeletonBlock height={70} width="48%" radius={20} />
        <SkeletonBlock height={70} width="48%" radius={20} />
      </View>
      <SkeletonList count={3} />
    </View>
  );
}

/**
 * Squelette d'image : remplit son parent (à placer en `absolute`), fond neutre avec un reflet qui balaie de gauche à droite
 * tant que l'image charge. `dark` pour un fond sombre (visionneuse plein écran).
 */
export function SkeletonShimmer({ radius = 0, dark = false }: { radius?: number; dark?: boolean }) {
  const { colors, scheme } = useTheme();
  const [width, setWidth] = useState(0);
  const [progress] = useState(() => new RNAnimated.Value(0));

  useEffect(() => {
    if (width === 0) return;
    progress.setValue(0);
    const loop = RNAnimated.loop(RNAnimated.timing(progress, { toValue: 1, duration: 1300, easing: RNEasing.inOut(RNEasing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [width, progress]);

  const base = dark ? 'rgba(255,255,255,0.08)' : colors.surface2;
  const light = dark || scheme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)';
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[StyleSheet.absoluteFill, { backgroundColor: base, borderRadius: radius, overflow: 'hidden' }]}
      accessibilityState={{ busy: true }}
    >
      {width > 0 ? (
        <RNAnimated.View style={[StyleSheet.absoluteFill, { width, transform: [{ translateX }] }]}>
          <LinearGradient colors={['transparent', light, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
        </RNAnimated.View>
      ) : null}
    </View>
  );
}
