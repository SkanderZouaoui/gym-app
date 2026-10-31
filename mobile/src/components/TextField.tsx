import { useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { KeyboardScrollContext } from './ui/KeyboardAwareScreen';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Aide sous le champ (masquée quand une erreur est affichée). */
  hint?: string;
  /** Pictogramme dans la tuile violette à gauche (même langage que les lignes de coordonnées du profil). */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Affiche un bouton œil pour basculer la visibilité — réservé aux champs mot de passe. */
  isPassword?: boolean;
}

/**
 * Champ de saisie aux couleurs de l'app : carte arrondie, tuile d'icône en dégradé violet, libellé en petites capitales,
 * bordure et halo violets au focus, erreur en rouge avec pictogramme. Se recale au-dessus du clavier dans un KeyboardAwareScreen.
 */
export function TextField({ label, error, hint, icon, style, isPassword, secureTextEntry, onFocus, onBlur, editable, multiline, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const keepVisible = useContext(KeyboardScrollContext);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const disabled = editable === false;
  const hasError = !!error;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          multiline && styles.cardMultiline,
          focused && styles.cardFocused,
          hasError && styles.cardError,
          disabled && styles.cardDisabled,
        ]}
      >
        {icon ? (
          hasError ? (
            <View style={[styles.tile, { backgroundColor: colors.dangerSoft }]}>
              <MaterialIcons name={icon} size={22} color={colors.dangerInk} />
            </View>
          ) : (
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
              <MaterialIcons name={icon} size={22} color="#FFFFFF" />
            </LinearGradient>
          )
        ) : null}
        <View style={styles.body}>
          <Text style={[styles.label, focused && !hasError && { color: colors.primaryInk }, hasError && { color: colors.dangerInk }]} numberOfLines={1}>
            {label.toUpperCase()}
          </Text>
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline, style]}
            placeholderTextColor={colors.muted}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
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
        </View>
        {isPassword ? (
          <Pressable style={styles.eyeButton} onPress={() => setVisible((v) => !v)} hitSlop={8} accessibilityRole="button">
            <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
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
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      minHeight: 66,
      paddingVertical: 10,
      paddingStart: 10,
      paddingEnd: 16,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cardMultiline: { alignItems: 'flex-start' },
    cardFocused: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    cardError: { borderColor: colors.danger },
    cardDisabled: { opacity: 0.6 },
    tile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0, justifyContent: 'center', paddingStart: 4 },
    label: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.7, color: colors.muted },
    input: { height: 30, padding: 0, marginTop: 1, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    inputMultiline: { height: undefined, minHeight: 72, textAlignVertical: 'top', paddingTop: 4 },
    eyeButton: { height: 44, justifyContent: 'center' },
    messageRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6 },
    error: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dangerInk },
    hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, paddingHorizontal: 6 },
  });
}
