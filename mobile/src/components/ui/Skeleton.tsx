import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
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
