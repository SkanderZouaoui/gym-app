import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type SetRowState = 'done' | 'current' | 'todo';

interface SetTableRowProps {
  setNumber: number;
  previousLabel: string;
  weightKg: string;
  reps: string;
  state: SetRowState;
  error?: boolean;
  onChangeWeight: (v: string) => void;
  onChangeReps: (v: string) => void;
  onValidate: () => void;
  onRemove?: () => void;
}

/** Ligne du tableau Série/Précédent/Kg/Rép pendant une séance guidée —
 * FitZone App Entraînement.dc.html, D3. Glisser vers la gauche révèle la
 * suppression de la série. */
export function SetTableRow({ setNumber, previousLabel, weightKg, reps, state, error, onChangeWeight, onChangeReps, onValidate, onRemove }: SetTableRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const swipeableRef = useRef<Swipeable>(null);
  const isDone = state === 'done';
  const isCurrent = state === 'current';
  const isEditable = !isDone;

  const row = (
    <View style={[styles.row, isCurrent && styles.rowCurrent]}>
      <Text style={styles.setNumber}>{setNumber}</Text>
      <Text style={styles.previous}>{previousLabel}</Text>
      {isDone ? (
        <Text style={styles.readValue}>{weightKg || '—'}</Text>
      ) : (
        <TextInput
          value={weightKg}
          onChangeText={onChangeWeight}
          editable={isEditable}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={colors.muted}
          style={[styles.input, error && styles.inputError]}
        />
      )}
      {isDone ? (
        <Text style={styles.readValue}>{reps || '—'}</Text>
      ) : (
        <TextInput
          value={reps}
          onChangeText={onChangeReps}
          editable={isEditable}
          keyboardType="number-pad"
          placeholder="—"
          placeholderTextColor={colors.muted}
          style={[styles.input, error && styles.inputError]}
        />
      )}
      <Pressable
        onPress={onValidate}
        disabled={!isEditable}
        style={[styles.checkbox, isDone && styles.checkboxDone]}
      >
        {isDone ? <MaterialIcons name="check" size={16} color={colors.primaryContrast} /> : null}
      </Pressable>
    </View>
  );

  if (!onRemove) return row;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={() => (
        <Pressable
          style={styles.deleteAction}
          onPress={() => {
            swipeableRef.current?.close();
            onRemove();
          }}
        >
          <MaterialIcons name="delete-outline" size={20} color={colors.primaryContrast} />
        </Pressable>
      )}
      overshootRight={false}
    >
      {row}
    </Swipeable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6,
      borderRadius: radii.xs,
    },
    rowCurrent: { backgroundColor: colors.primarySoft },
    setNumber: { width: 40, fontFamily: fonts.headBold, fontSize: 13, color: colors.text, textAlign: 'center' },
    previous: { flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    readValue: { width: 60, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, textAlign: 'center' },
    input: {
      width: 60, height: 36, borderRadius: radii.xs, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface, textAlign: 'center', fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text,
    },
    inputError: { borderColor: colors.danger },
    checkbox: {
      width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.borderStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
    deleteAction: {
      width: 64, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
      borderRadius: radii.xs, marginLeft: 6,
    },
  });
}
