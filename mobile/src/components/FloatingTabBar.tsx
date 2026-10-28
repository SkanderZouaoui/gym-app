import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useTabBarStore } from '../store/tabBar';

/** Sous-ensemble des props `tabBar` de React Navigation dont on a besoin
 * (React Navigation est embarqué dans expo-router, pas résolvable directement). API SDK 58 : emitter + navigateToTab.. */
interface TabBarRoute {
  key: string;
  name: string;
}
interface TabBarDescriptor {
  options: {
    title?: string;
    tabBarLabel?: unknown;
    tabBarItemStyle?: unknown;
    tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  };
}
export interface FloatingTabBarProps {
  state: { index: number; routes: TabBarRoute[] };
  descriptors: Record<string, TabBarDescriptor>;
  emitter: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
  };
  navigateToTab: (key: string) => void;
  /** Route rendue comme bouton d'action rond à droite de la barre (QR, scanner). */
  actionRoute?: string;
  actionIcon?: keyof typeof MaterialIcons.glyphMap;
}

const BAR_HEIGHT = 68;
const INDICATOR_W = 50;
const INDICATOR_H = 56;
const SPRING = { damping: 14, stiffness: 180 };
const EASE_OUT = Easing.bezier(0.32, 0.72, 0, 1);

/** Barre d'onglets flottante v2 : pilule en verre dépoli, indicateur d'onglet actif
 * qui glisse (ressort), icône active agrandie, libellé visible uniquement sur l'onglet
 * actif, bouton d'action rond en dégradé avec lueur, haptique, repli au scroll. */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, actionRoute, actionIcon = 'qr-code-2' }: FloatingTabBarProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const dark = scheme === 'dark';
  const reduceMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(colors, dark), [colors, dark]);
  const hidden = useTabBarStore((s) => s.hidden);
  const setHidden = useTabBarStore((s) => s.setHidden);

  const press = (route: TabBarRoute, focused: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigateToTab(route.key);
  };

  const visible = state.routes.filter((route) => {
    const style = StyleSheet.flatten(descriptors[route.key]?.options.tabBarItemStyle as never) as { display?: string } | undefined;
    return style?.display !== 'none';
  });
  const tabs = visible.filter((r) => r.name !== actionRoute);
  const action = visible.find((r) => r.name === actionRoute);
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = tabs.findIndex((r) => r.key === activeKey);

  // Une navigation (changement d'onglet) réaffiche toujours la barre.
  useEffect(() => {
    setHidden(false);
  }, [activeKey, setHidden]);

  const [rowWidth, setRowWidth] = useState(0);
  const slot = tabs.length > 0 ? (rowWidth - 12) / tabs.length : 0;
  const indicatorX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const offset = BAR_HEIGHT + Math.max(insets.bottom - 6, 10) + 24;

  useEffect(() => {
    if (activeIndex < 0 || slot === 0) return;
    const target = activeIndex * slot + (slot - INDICATOR_W) / 2;
    indicatorX.value = reduceMotion ? withTiming(target, { duration: 120 }) : withSpring(target, SPRING);
  }, [activeIndex, slot, reduceMotion, indicatorX]);

  useEffect(() => {
    translateY.value = withTiming(hidden ? offset : 0, { duration: reduceMotion ? 120 : 450, easing: EASE_OUT });
  }, [hidden, offset, reduceMotion, translateY]);

  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom - 6, 10) }, wrapStyle]}
    >
      <View style={styles.barShadow}>
        <View style={styles.barClip}>
          <BlurView intensity={60} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
          <View
            style={styles.row}
            onLayout={(e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width)}
          >
            {slot > 0 && activeIndex >= 0 ? <Animated.View style={[styles.indicator, indicatorStyle]} /> : null}
            {tabs.map((route) => {
              const { options } = descriptors[route.key];
              const focused = route.key === activeKey;
              const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
              return (
                <TabItem
                  key={route.key}
                  label={label}
                  focused={focused}
                  reduceMotion={reduceMotion}
                  color={focused ? colors.primaryInk : colors.muted}
                  icon={options.tabBarIcon}
                  onPress={() => press(route, focused)}
                  styles={styles}
                />
              );
            })}
          </View>
        </View>
      </View>
      {action ? (
        <Pressable
          onPress={() => press(action, action.key === activeKey)}
          accessibilityRole="button"
          accessibilityLabel={descriptors[action.key]?.options.title || action.name}
          style={({ pressed }) => [styles.actionShadow, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryPressed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.action}
          >
            <MaterialIcons name={actionIcon} size={30} color={colors.primaryContrast} />
          </LinearGradient>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

interface TabItemProps {
  label: string;
  focused: boolean;
  reduceMotion: boolean;
  color: string;
  icon: TabBarDescriptor['options']['tabBarIcon'];
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}

function TabItem({ label, focused, reduceMotion, color, icon, onPress, styles }: TabItemProps) {
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(focused ? 1 : 0, { duration: 120 })
      : focused
        ? withSpring(1, SPRING)
        : withTiming(0, { duration: 250 });
  }, [focused, reduceMotion, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -7 * progress.value }, { scale: 1 + 0.12 * progress.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, progress.value)),
    transform: [{ translateY: 6 * (1 - Math.min(1, progress.value)) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={styles.item}
    >
      <Animated.View style={iconStyle}>{icon?.({ focused, color, size: 24 })}</Animated.View>
      <Animated.Text style={[styles.label, { color }, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], dark: boolean) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 8,
    },
    barShadow: {
      flex: 1,
      height: BAR_HEIGHT,
      borderRadius: BAR_HEIGHT / 2,
      shadowColor: dark ? '#000' : '#1E0A46',
      shadowOffset: { width: 0, height: dark ? 18 : 14 },
      shadowOpacity: dark ? 0.6 : 0.18,
      shadowRadius: dark ? 24 : 22,
      elevation: 10,
    },
    barClip: {
      flex: 1,
      borderRadius: BAR_HEIGHT / 2,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
    indicator: {
      position: 'absolute',
      left: 6,
      top: (BAR_HEIGHT - 2 - INDICATOR_H) / 2,
      width: INDICATOR_W,
      height: INDICATOR_H,
      borderRadius: INDICATOR_H / 2,
      backgroundColor: colors.primarySoft,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: dark ? 0.5 : 0.3,
      shadowRadius: 9,
    },
    item: { flex: 1, height: INDICATOR_H, alignItems: 'center', justifyContent: 'center' },
    label: { position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 10.5 },
    actionShadow: {
      width: BAR_HEIGHT,
      height: BAR_HEIGHT,
      borderRadius: BAR_HEIGHT / 2,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: dark ? 0.5 : 0.35,
      shadowRadius: 14,
      elevation: 8,
    },
    action: {
      flex: 1,
      borderRadius: BAR_HEIGHT / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
    },
  });
}
