import { useMemo } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  tone?: 'surface' | 'secondary';
  selected?: boolean;
}

export function Card({ children, onPress, style, tone = 'surface', selected }: CardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const base = [
    styles.base,
    tone === 'secondary' ? styles.secondary : styles.surface,
    selected && styles.selected,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    base: { borderRadius: radii.md, padding: spacing.md, gap: 10 },
    surface: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    secondary: { backgroundColor: colors.secondary },
    selected: { borderColor: colors.primary, borderWidth: 2 },
    pressed: { opacity: 0.9 },
  });
}
