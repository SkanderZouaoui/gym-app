import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

export type SetRowState = 'done' | 'current' | 'todo';

interface SetTableRowProps {
  setNumber: number;
  /** Conservé pour compatibilité : la colonne « Précédent » n'est plus affichée (maquette v2). */
  previousLabel?: string;
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
export function SetTableRow({ setNumber, weightKg, reps, state, error, onChangeWeight, onChangeReps, onValidate, onRemove }: SetTableRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const swipeableRef = useRef<SwipeableMethods>(null);
  const isDone = state === 'done';
  const isCurrent = state === 'current';

  const row = (
    <View style={[styles.row, isCurrent && styles.rowCurrent]}>
      <Text style={styles.setNumber}>{setNumber}</Text>
      <TextInput
        value={weightKg}
        onChangeText={onChangeWeight}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={colors.muted}
        selectTextOnFocus
        style={[styles.input, isDone && styles.inputDone, error && styles.inputError]}
      />
      <TextInput
        value={reps}
        onChangeText={onChangeReps}
        keyboardType="number-pad"
        placeholder="—"
        placeholderTextColor={colors.muted}
        selectTextOnFocus
        style={[styles.input, isDone && styles.inputDone, error && styles.inputError]}
      />
      <Pressable
        onPress={onValidate}
        disabled={isDone}
        accessibilityLabel={t('member.valider_la_serie_2')}
        style={[styles.checkbox, isDone && styles.checkboxDone]}
      >
        <MaterialIcons name="check" size={24} color={isDone ? colors.primaryContrast : colors.muted} />
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
    row: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: colors.surface },
    rowCurrent: { backgroundColor: colors.primarySoft, paddingHorizontal: 4 },
    setNumber: { width: 34, fontFamily: fonts.head, fontSize: 15, color: colors.muted, textAlign: 'center' },
    input: {
      flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface2, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text,
    },
    inputDone: { backgroundColor: colors.successSoft, borderColor: colors.successSoft, color: colors.successInk },
    inputError: { borderColor: colors.danger },
    checkbox: {
      width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
    deleteAction: {
      width: 64, minHeight: 52, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
      borderRadius: 14, marginLeft: 6,
    },
  });
}
