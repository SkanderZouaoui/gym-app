import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}

/** Sélecteur à pastille glissante (même style que l'historique, les réservations et les notifications) :
 * fond gris, pastille blanche qui glisse sous l'option choisie, compteur facultatif, petite vibration. */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const n = options.length;
  const itemW = width > 0 ? (width - 8 - (n - 1) * 4) / n : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(4);
  useEffect(() => {
    const target = 4 + index * (itemW + 4);
    x.value = reduceMotion ? target : withTiming(target, { duration: 260, easing: Easing.bezier(0.3, 0.9, 0.3, 1) });
  }, [index, itemW, reduceMotion, x]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {itemW > 0 ? <Animated.View pointerEvents="none" style={[styles.thumb, { width: itemW }, thumbStyle]} /> : null}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(opt.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={styles.segment}
          >
            <Text style={[styles.label, active && styles.activeLabel]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{opt.label}</Text>
            {opt.count !== undefined ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && { color: '#FFFFFF' }]}>{opt.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    track: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: radii.full, backgroundColor: colors.surface2, position: 'relative' },
    thumb: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: radii.full, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    segment: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
    label: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.muted, flexShrink: 1 },
    activeLabel: { color: colors.text },
    badge: { minWidth: 22, paddingHorizontal: 6, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border },
    badgeActive: { backgroundColor: colors.deep },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.muted },
  });
}
