import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  return (
    <View style={styles.toast} accessibilityRole="alert">
      <MaterialIcons name={icon} size={18} color={iconColor ?? colors.success} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    toast: {
      position: 'absolute',
      bottom: 112,
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
    text: { fontFamily: fonts.bodySemiBold, color: colors.bg, fontSize: 13 },
  });
}
