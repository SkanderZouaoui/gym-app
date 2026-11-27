import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { haptics } from '../../utils/haptics';

export type TrainingTab = 'proposed' | 'programs' | 'history' | 'exercises';

export const TRAINING_TAB_ORDER: TrainingTab[] = ['proposed', 'programs', 'history', 'exercises'];

const TABS: { value: TrainingTab; icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
  { value: 'proposed', icon: 'bookmark', get label() { return i18n.t('member.proposes'); } },
  { value: 'programs', icon: 'fitness-center', get label() { return i18n.t('training.tabPrograms'); } },
  { value: 'history', icon: 'history', get label() { return i18n.t('member.historique'); } },
  { value: 'exercises', icon: 'sports-gymnastics', get label() { return i18n.t('common.exercices'); } },
];

const PAD = 4;

/** Sous-menus de l'onglet Entraînement : segments de largeur égale, avec un curseur en dégradé qui glisse vers l'onglet actif. */
export function TrainingTabs({ value, onChange }: { value: TrainingTab; onChange: (tab: TrainingTab) => void }) {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? (width - PAD * 2) / TABS.length : 0;
  const index = Math.max(0, TRAINING_TAB_ORDER.indexOf(value));
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
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            style={styles.tab}
            onPress={() => { if (!active) { haptics.selection(); onChange(tab.value); } }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <MaterialIcons name={tab.icon} size={18} color={active ? colors.primaryContrast : colors.muted} />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row', padding: PAD, borderRadius: 20, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    indicator: {
      position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: 16, overflow: 'hidden',
      shadowColor: colors.hero2, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    tab: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 6 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, textAlign: 'center', color: colors.muted },
    labelActive: { color: colors.primaryContrast },
  });
}
