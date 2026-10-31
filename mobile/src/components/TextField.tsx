import { useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
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
  /** Pictogramme dans la tuile violette à gauche. */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Affiche un bouton œil pour basculer la visibilité — réservé aux champs mot de passe. */
  isPassword?: boolean;
}

/**
 * Champ de saisie aux couleurs de l'app. Se lit clairement comme un champ modifiable : libellé au-dessus, zone de saisie
 * en creux (fond + bordure), crayon à droite au repos, bouton d'effacement pendant la saisie ; cadenas s'il est en lecture seule.
 * Toute la zone ouvre le clavier. Bordure et halo violets au focus, rouge en erreur.
 */
export function TextField({ label, error, hint, icon, style, isPassword, secureTextEntry, onFocus, onBlur, editable, multiline, value, onChangeText, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);
  const keepVisible = useContext(KeyboardScrollContext);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const readOnly = editable === false;
  const hasError = !!error;
  const hasValue = !!value && value.length > 0;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => inputRef.current?.focus()} disabled={readOnly} accessible={false}>
        <Text style={[styles.label, focused && !hasError && { color: colors.primaryInk }, hasError && { color: colors.dangerInk }]} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => inputRef.current?.focus()}
        disabled={readOnly}
        accessible={false}
        style={[styles.well, multiline && styles.wellMultiline, focused && styles.wellFocused, hasError && styles.wellError, readOnly && styles.wellReadOnly]}
      >
        {icon ? (
          hasError ? (
            <View style={[styles.tile, { backgroundColor: colors.dangerSoft }]}>
              <MaterialIcons name={icon} size={20} color={colors.dangerInk} />
            </View>
          ) : (
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, readOnly && { opacity: 0.55 }]}>
              <MaterialIcons name={icon} size={20} color="#FFFFFF" />
            </LinearGradient>
          )
        ) : null}

        <TextInput
          ref={inputRef}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          secureTextEntry={isPassword ? !visible : secureTextEntry}
          editable={editable}
          multiline={multiline}
          value={value}
          onChangeText={onChangeText}
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
          <Pressable style={styles.action} onPress={() => setVisible((v) => !v)} hitSlop={8} accessibilityRole="button">
            <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={22} color={colors.muted} />
          </Pressable>
        ) : readOnly ? (
          <MaterialIcons name="lock-outline" size={18} color={colors.muted} />
        ) : focused && hasValue && !multiline ? (
          <Pressable style={styles.action} onPress={() => onChangeText?.('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('member.effacer')}>
            <MaterialIcons name="cancel" size={20} color={colors.muted} />
          </Pressable>
        ) : !focused && !multiline ? (
          <MaterialIcons name="edit" size={18} color={colors.primary} style={{ opacity: 0.75 }} />
        ) : null}
      </Pressable>

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
    container: { gap: 7 },
    label: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.7, color: colors.muted, paddingHorizontal: 4 },
    well: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 58,
      paddingStart: 10,
      paddingEnd: 14,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    wellMultiline: { alignItems: 'flex-start', paddingVertical: 10 },
    wellFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      shadowColor: colors.primary,
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    wellError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
    wellReadOnly: { opacity: 0.65 },
    tile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, minWidth: 0, height: 54, padding: 0, paddingStart: 4, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    inputMultiline: { height: undefined, minHeight: 84, textAlignVertical: 'top', paddingTop: 6 },
    action: { height: 44, justifyContent: 'center' },
    messageRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6 },
    error: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dangerInk },
    hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, paddingHorizontal: 6 },
  });
}
