import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

interface ProfileFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
}

/** Champ de formulaire épuré : libellé discret au-dessus, zone de saisie arrondie, liseré violet foncé et halo léger au focus. */
export function ProfileField({ label, error, onFocus, onBlur, ...input }: ProfileFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInputInstance>(null);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, focused && { color: colors.text }]}>{label}</Text>
      <Pressable onPress={() => ref.current?.focus()} accessible={false} style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}>
        <TextInput
          ref={ref}
          {...input}
          placeholderTextColor={colors.muted}
          selectionColor={colors.deep}
          cursorColor={colors.deep}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={styles.input}
        />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { gap: 7 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted, marginStart: 4 },
    box: { height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 16, justifyContent: 'center' },
    boxFocused: { borderColor: colors.deep, shadowColor: colors.deep, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    boxError: { borderColor: colors.danger },
    input: { height: '100%', padding: 0, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    error: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dangerInk, marginStart: 4 },
  });
}
