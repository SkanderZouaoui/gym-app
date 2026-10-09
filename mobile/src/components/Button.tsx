import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const { styles, variantStyles, textVariantStyles } = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.label, textVariantStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const styles = StyleSheet.create({
    base: {
      height: 52,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    label: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.85,
    },
  });

  const variantStyles = StyleSheet.create({
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondary },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.borderStrong },
    ghost: { backgroundColor: 'transparent' },
  });

  const textVariantStyles = StyleSheet.create({
    primary: { color: colors.primaryContrast },
    secondary: { color: colors.onSecondary },
    outline: { color: colors.text },
    ghost: { color: colors.primaryInk },
  });

  return { styles, variantStyles, textVariantStyles };
}
