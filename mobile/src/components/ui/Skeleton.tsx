import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export function SkeletonBlock({ height, width, radius = radii.md, style }: { height: number; width?: number | `${number}%`; radius?: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { height, width: width ?? '100%', borderRadius: radius, backgroundColor: colors.surface2, opacity },
        style,
      ]}
    />
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
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (width === 0) return;
    progress.setValue(0);
    const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
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
        <Animated.View style={[StyleSheet.absoluteFill, { width, transform: [{ translateX }] }]}>
          <LinearGradient colors={['transparent', light, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}
    </View>
  );
}
