import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  cycling: 'directions-bike',
  pilates: 'sports-gymnastics',
  hiit: 'local-fire-department',
  yoga: 'self-improvement',
  boxe: 'sports-martial-arts',
};

function pickIcon(name: string): keyof typeof MaterialIcons.glyphMap {
  const key = name.toLowerCase();
  for (const k of Object.keys(ICONS)) {
    if (key.includes(k)) return ICONS[k];
  }
  return 'fitness-center';
}

export function ClassTypeIcon({ name, size = 48 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size > 44 ? radii.md : radii.sm }]}>
      <MaterialIcons name={pickIcon(name)} size={size * 0.52} color={colors.primaryInk} />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    box: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  });
}
