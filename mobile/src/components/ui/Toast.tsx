import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface ToastProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
  iconColor?: string;
  /** Action à droite (« Annuler »). */
  actionLabel?: string;
  onAction?: () => void;
}

/** Toast — maquette « Feedback & états », « Toasts » : carte à bordure fine et ombre douce, icône colorée, message,
 * action optionnelle en violet. Il arrive en glissant ; placé en haut de l'écran pour ne jamais chevaucher la barre
 * d'enregistrement ni la barre d'onglets. */
export function Toast({ icon, text, iconColor, actionLabel, onAction }: ToastProps) {
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors, scheme === 'dark'), [colors, scheme]);
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInUp.duration(350)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.toast, { top: insets.top + 10 }]}
      accessibilityRole="alert"
      pointerEvents={actionLabel ? 'box-none' : 'none'}
    >
      <MaterialIcons name={icon} size={22} color={iconColor ?? colors.successInk} />
      <Text style={styles.text}>{text}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], dark: boolean) {
  return StyleSheet.create({
    toast: {
      position: 'absolute',
      zIndex: 100,
      left: spacing.lg,
      right: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      paddingVertical: 13,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: dark ? '#000000' : '#281458',
      shadowOpacity: dark ? 0.4 : 0.14,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
    text: { flex: 1, fontFamily: fonts.bodySemiBold, color: colors.text, fontSize: 14 },
    action: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  });
}
