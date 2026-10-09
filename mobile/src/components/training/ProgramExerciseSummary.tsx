import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface SetSummary {
  setNumber: number;
  reps?: number;
  weightKg?: number;
}

interface ProgramExerciseSummaryProps {
  name: string;
  sets: SetSummary[];
  onRemove: () => void;
  onEdit: () => void;
}

/** Résumé d'un exercice dans le composeur de programme : chaque série est
 * affichée individuellement (reps + poids), pas de réglage global répété. */
export function ProgramExerciseSummary({ name, sets, onRemove, onEdit }: ProgramExerciseSummaryProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.card} onPress={onEdit}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <MaterialIcons name="delete-outline" size={20} color={colors.dangerInk} />
        </Pressable>
      </View>
      <View style={styles.setsRow}>
        {sets.map((s) => (
          <View key={s.setNumber} style={styles.setPill}>
            <Text style={styles.setPillText}>
              {s.reps ?? '—'} reps{s.weightKg ? ` · ${s.weightKg}kg` : ''}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.sm, gap: 8,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, textTransform: 'capitalize', flex: 1 },
    setsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    setPill: { backgroundColor: colors.secondarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    setPillText: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.secondaryInk },
  });
}
