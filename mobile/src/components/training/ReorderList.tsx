import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';

/** Hauteur d'une ligne + espace entre deux lignes : fixe, ce qui rend le calcul de la position cible trivial. */
const ROW = 64;
const GAP = 10;
const STEP = ROW + GAP;

export interface ReorderItem {
  key: string;
  title: string;
  subtitle?: string;
}

interface Shared {
  active: SharedValue<number>;
  target: SharedValue<number>;
  dragY: SharedValue<number>;
}

/** Liste réorganisable par glisser-déposer : on attrape la poignée d'une ligne, on la déplace, les autres s'écartent,
 * et le nouvel ordre est renvoyé au relâchement. */
export function ReorderList({ items, onReorder }: { items: ReorderItem[]; onReorder: (from: number, to: number) => void }) {
  const active = useSharedValue(-1);
  const target = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const shared: Shared = { active, target, dragY };

  const finish = (from: number, to: number) => {
    if (to !== from) onReorder(from, to);
    // Remise à zéro après la mise à jour de l'ordre, pour éviter un saut visuel.
    requestAnimationFrame(() => {
      active.value = -1;
      target.value = -1;
      dragY.value = 0;
    });
  };

  return (
    <View style={{ height: items.length * STEP - GAP }}>
      {items.map((item, i) => (
        <ReorderRow key={item.key} item={item} index={i} count={items.length} shared={shared} onFinish={finish} />
      ))}
    </View>
  );
}

function ReorderRow({ item, index, count, shared, onFinish }: { item: ReorderItem; index: number; count: number; shared: Shared; onFinish: (from: number, to: number) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { active, target, dragY } = shared;

  const pan = usePanGesture({
    minDistance: 0,
    onActivate: () => {
      'worklet';
      active.value = index;
      target.value = index;
      dragY.value = 0;
      runOnJS(haptics.light)();
    },
    onUpdate: (e) => {
      'worklet';
      dragY.value = e.translationY;
      const next = Math.min(count - 1, Math.max(0, Math.round((index * STEP + e.translationY) / STEP)));
      if (next !== target.value) {
        target.value = next;
        runOnJS(haptics.selection)();
      }
    },
    onDeactivate: () => {
      'worklet';
      runOnJS(onFinish)(index, target.value < 0 ? index : target.value);
    },
  });

  const rowStyle = useAnimatedStyle(() => {
    const isActive = active.value === index;
    let shift = 0;
    if (!isActive && active.value >= 0) {
      if (active.value < target.value && index > active.value && index <= target.value) shift = -STEP;
      else if (active.value > target.value && index >= target.value && index < active.value) shift = STEP;
    }
    return {
      transform: [{ translateY: isActive ? dragY.value : withSpring(shift, { damping: 22, stiffness: 260 }) }, { scale: withSpring(isActive ? 1.03 : 1) }],
      zIndex: isActive ? 10 : 0,
      shadowOpacity: isActive ? 0.25 : 0,
      elevation: isActive ? 10 : 0,
    };
  });

  return (
    <Animated.View style={[styles.row, { top: index * STEP }, rowStyle]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
      </View>
      <GestureDetector gesture={pan}>
        <View style={styles.handle} hitSlop={8}>
          <MaterialIcons name="drag-indicator" size={26} color={colors.muted} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      position: 'absolute', left: 0, right: 0, height: ROW, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 6,
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      shadowColor: colors.deep, shadowOffset: { width: 0, height: 10 }, shadowRadius: 14,
    },
    badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontFamily: fonts.head, fontSize: 13, color: '#FFFFFF' },
    title: { fontFamily: fonts.headBold, fontSize: 15, letterSpacing: -0.2, color: colors.text, textTransform: 'capitalize' },
    subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
    handle: { width: 52, height: ROW - 8, alignItems: 'center', justifyContent: 'center' },
  });
}
