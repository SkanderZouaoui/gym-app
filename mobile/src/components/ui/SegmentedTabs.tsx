import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';

export interface SegmentedTabItem<T extends string> {
  value: T;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

const PAD = 4;

/** Sous-menus à segments de largeur égale : curseur en dégradé violet foncé qui glisse vers l'onglet actif (icône au-dessus du libellé). */
export function SegmentedTabs<T extends string>({ items, value, onChange }: { items: SegmentedTabItem<T>[]; value: T; onChange: (value: T) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? (width - PAD * 2) / items.length : 0;
  const index = Math.max(0, items.findIndex((i) => i.value === value));
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(index * cell, { damping: 20, stiffness: 230, mass: 0.9 });
  }, [index, cell, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {cell > 0 ? (
        <Animated.View style={[styles.indicator, { width: cell }, indicator]}>
          <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            style={styles.tab}
            onPress={() => { if (!active) { haptics.selection(); onChange(item.value); } }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <MaterialIcons name={item.icon} size={18} color={active ? colors.primaryContrast : colors.muted} />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    track: { flexDirection: 'row', padding: PAD, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    indicator: {
      position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: 16, overflow: 'hidden',
      shadowColor: colors.hero2, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    tab: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 6 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.muted },
    labelActive: { color: colors.primaryContrast },
  });
}
