import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface ChipProps {
  label: string;
  active?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  trailingIcon?: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
}

export function Chip({ label, active, icon, trailingIcon, onPress }: ChipProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.active : styles.inactive]}
    >
      {icon ? (
        <MaterialIcons name={icon} size={16} color={active ? colors.onSecondary : colors.text} />
      ) : null}
      <Text style={[styles.label, { color: active ? colors.onSecondary : colors.text }]}>{label}</Text>
      {trailingIcon ? (
        <MaterialIcons name={trailingIcon} size={16} color={active ? colors.onSecondary : colors.muted} />
      ) : null}
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 38,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
    },
    active: { backgroundColor: colors.secondary, borderColor: colors.secondary },
    inactive: { backgroundColor: colors.surface, borderColor: colors.border },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  });
}
