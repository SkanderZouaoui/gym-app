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
