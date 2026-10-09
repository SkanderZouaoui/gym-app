import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export interface SetDraft {
  setNumber: number;
  reps: string;
  weightKg: string;
}

interface SetRowProps {
  set: SetDraft;
  onChangeReps: (reps: string) => void;
  onChangeWeight: (weightKg: string) => void;
  onRemove: () => void;
}

/** Ligne d'une série individuelle, éditable (reps + poids propres à cette série). */
export function SetRow({ set, onChangeReps, onChangeWeight, onRemove }: SetRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={styles.setBadge}>
        <Text style={styles.setBadgeText}>{set.setNumber}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Répétitions</Text>
        <TextInput
          value={set.reps}
          onChangeText={onChangeReps}
          keyboardType="number-pad"
          placeholder="10"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Poids (kg)</Text>
        <TextInput
          value={set.weightKg}
          onChangeText={onChangeWeight}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.removeButton}>
        <MaterialIcons name="close" size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    setBadge: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: colors.secondarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    setBadgeText: { fontFamily: fonts.headBold, fontSize: 12, color: colors.secondaryInk },
    field: { flex: 1, gap: 4 },
    fieldLabel: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted },
    input: {
      height: 38, borderRadius: radii.xs, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 10, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, backgroundColor: colors.surface,
    },
    removeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  });
}
