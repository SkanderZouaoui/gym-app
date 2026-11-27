import { useContext, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { KeyboardScrollContext } from './ui/KeyboardAwareScreen';

interface PasswordFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  error?: string;
  /** Champ valide (coche verte à droite). */
  valid?: boolean;
  /** Hauteur à garder visible sous le champ quand le clavier est ouvert (ex. jauge de force). */
  revealBelow?: number;
}

/** Champ mot de passe épuré : libellé au-dessus, zone claire arrondie, tuile d'icône qui s'allume au focus, œil pour afficher/masquer. */
export function PasswordField({ label, icon = 'lock-outline', error, valid, revealBelow, onFocus, onBlur, ...input }: PasswordFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const keepVisible = useContext(KeyboardScrollContext);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<TextInputInstance>(null);
  const hasError = !!error;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, focused && { color: colors.deep }, hasError && { color: colors.dangerInk }]}>{label}</Text>
      <Pressable
        onPress={() => ref.current?.focus()}
        accessible={false}
        style={[styles.well, focused && styles.wellFocused, hasError && styles.wellError]}
      >
        {focused && !hasError ? (
          <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
            <MaterialIcons name={icon} size={19} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <View style={[styles.tile, { backgroundColor: hasError ? colors.dangerSoft : colors.primarySoft }]}>
            <MaterialIcons name={icon} size={19} color={hasError ? colors.dangerInk : colors.primaryInk} />
          </View>
        )}
        <TextInput
          ref={ref}
          {...input}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.muted}
          selectionColor={colors.deep}
          cursorColor={colors.deep}
          onFocus={(e) => { setFocused(true); keepVisible(revealBelow); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={styles.input}
        />
        {valid && !hasError ? <MaterialIcons name="check-circle" size={20} color={colors.successInk} /> : null}
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10} accessibilityRole="button" style={styles.eye}>
          <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={21} color={colors.muted} />
        </Pressable>
      </Pressable>
      {hasError ? (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={14} color={colors.dangerInk} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginStart: 4 },
    well: {
      flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingStart: 10, paddingEnd: 14,
      borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2,
    },
    wellFocused: {
      backgroundColor: colors.surface, borderColor: colors.deep,
      shadowColor: colors.deep, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5,
    },
    wellError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
    tile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, minWidth: 0, height: 56, padding: 0, fontFamily: fonts.bodySemiBold, fontSize: 16, letterSpacing: 0.4, color: colors.text },
    eye: { height: 44, justifyContent: 'center' },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginStart: 4 },
    error: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dangerInk },
  });
}
