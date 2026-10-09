import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { ExerciseGif } from './ExerciseGif';

interface ExerciseListItemProps {
  name: string;
  muscleGroup: string | null;
  mediaKey?: string | null;
  onPress?: () => void;
  trailing?: React.ReactNode;
}

/** Ligne de la bibliothèque d'exercices — vignette GIF + nom + groupe musculaire. */
export function ExerciseListItem({ name, muscleGroup, mediaKey, onPress, trailing }: ExerciseListItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <ExerciseGif uri={mediaKey ?? null} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {muscleGroup ? <Text style={styles.meta}>{muscleGroup}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
      borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm,
    },
    name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, textTransform: 'capitalize' },
    meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
  });
}
