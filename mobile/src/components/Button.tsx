import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { scheme } = useTheme();
  const { styles, variantStyles, textVariantStyles } = useMemo(() => makeStyles(colors), [colors]);
  const gradient = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        gradient && !disabled && { shadowColor: colors.primary, shadowOpacity: scheme === 'dark' ? 0.45 : 0.3, ...styles.glow },
        disabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {gradient && !disabled ? (
        <LinearGradient
          colors={[colors.primary, colors.primaryPressed]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#fff'} />
        ) : (
          <Text style={[styles.label, textVariantStyles[variant], disabled && { color: colors.muted }]}>{label}</Text>
        )}
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const styles = StyleSheet.create({
    base: {
      minHeight: 52,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      overflow: 'hidden',
    },
    content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    glow: { shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 6 },
    label: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
    },
    disabled: {
      backgroundColor: colors.surface2,
    },
    pressed: {
      transform: [{ scale: 0.97 }],
    },
  });

  const variantStyles = StyleSheet.create({
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondary },
    outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
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
