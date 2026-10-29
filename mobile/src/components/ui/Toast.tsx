import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface ToastProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
  iconColor?: string;
}

export function Toast({ icon, text, iconColor }: ToastProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  // En haut de l'écran : ne chevauche jamais la barre d'enregistrement ni la barre d'onglets.
  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.toast, { top: insets.top + 10 }]}
      accessibilityRole="alert"
      pointerEvents="none"
    >
      <MaterialIcons name={icon} size={18} color={iconColor ?? colors.success} />
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    toast: {
      position: 'absolute',
      zIndex: 100,
      left: spacing.lg,
      right: spacing.lg,
      backgroundColor: colors.text,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    text: { flex: 1, fontFamily: fonts.bodySemiBold, color: colors.bg, fontSize: 13 },
  });
}
