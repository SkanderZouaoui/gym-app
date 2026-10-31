import { useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { KeyboardScrollContext } from './ui/KeyboardAwareScreen';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Aide sous le champ (masquée quand une erreur est affichée). */
  hint?: string;
  /** Icône à gauche du champ ; elle prend la couleur d'accent quand le champ est actif. */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Affiche un bouton œil pour basculer la visibilité — réservé aux champs mot de passe. */
  isPassword?: boolean;
}

/** Champ de saisie : bordure d'accent au focus, icône optionnelle, aide et erreur lisibles ; défile au-dessus du clavier dans un KeyboardAwareScreen. */
export function TextField({ label, error, hint, icon, style, isPassword, secureTextEntry, onFocus, onBlur, editable, multiline, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const keepVisible = useContext(KeyboardScrollContext);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const disabled = editable === false;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, focused && !error && styles.labelFocused]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          focused && styles.inputWrapFocused,
          !!error && styles.inputWrapError,
          disabled && styles.inputWrapDisabled,
        ]}
      >
        {icon ? <MaterialIcons name={icon} size={22} color={error ? colors.danger : focused ? colors.primary : colors.muted} /> : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline, style]}
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          secureTextEntry={isPassword ? !visible : secureTextEntry}
          editable={editable}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            keepVisible();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {isPassword ? (
          <Pressable style={styles.eyeButton} onPress={() => setVisible((v) => !v)} hitSlop={8} accessibilityRole="button">
            <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.messageRow}>
          <MaterialIcons name="error-outline" size={14} color={colors.dangerInk} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { gap: 6 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted },
    labelFocused: { color: colors.primaryInk },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 56,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 16,
      backgroundColor: colors.surface2,
    },
    inputWrapMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
    inputWrapFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
    inputWrapError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
    inputWrapDisabled: { opacity: 0.6 },
    input: { flex: 1, minWidth: 0, height: 52, fontFamily: fonts.body, fontSize: 16, color: colors.text, paddingVertical: 0 },
    inputMultiline: { height: undefined, minHeight: 80, textAlignVertical: 'top' },
    eyeButton: { height: 52, justifyContent: 'center' },
    messageRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    error: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dangerInk },
    hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  });
}
