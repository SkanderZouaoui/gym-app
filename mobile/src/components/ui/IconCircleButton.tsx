import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface IconCircleButtonProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  size?: number;
  background?: string;
  iconColor?: string;
  bordered?: boolean;
  badge?: boolean;
}

export function IconCircleButton({
  icon,
  onPress,
  size = 44,
  background,
  iconColor,
  bordered = true,
  badge,
}: IconCircleButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bg = background ?? colors.surface;
  const fg = iconColor ?? colors.text;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: bordered ? 1 : 0,
          borderColor: colors.border,
        },
      ]}
    >
      <MaterialIcons name={icon} size={size * 0.5} color={fg} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    base: { alignItems: 'center', justifyContent: 'center' },
    badge: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.danger,
      borderWidth: 2,
      borderColor: colors.surface,
    },
  });
}
