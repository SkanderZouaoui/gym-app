import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface ActionRowButtonProps {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  /** Icône de fin (flèche par défaut). */
  trailingIcon?: keyof typeof MaterialIcons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

/** Bouton large en dégradé violet foncé (comme « Mes réservations ») : icône dans un rond, libellé, flèche. */
export function ActionRowButton({ label, icon, onPress, trailingIcon = 'chevron-right', style }: ActionRowButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, style, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}
    >
      <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.icon}>
        <MaterialIcons name={icon} size={20} color={colors.primaryContrast} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <MaterialIcons name={trailingIcon} size={22} color={colors.primaryContrast} />
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    button: {
      minHeight: 60, borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14,
      shadowColor: colors.hero2, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
    label: { flex: 1, fontFamily: fonts.headBold, fontSize: 15, color: colors.primaryContrast },
  });
}
