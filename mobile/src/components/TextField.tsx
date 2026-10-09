import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Affiche un bouton œil pour basculer la visibilité — réservé aux champs mot de passe. */
  isPassword?: boolean;
}

export function TextField({ label, error, style, isPassword, secureTextEntry, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, error && styles.inputError, isPassword && styles.inputWithIcon, style]}
          placeholderTextColor={colors.muted}
          secureTextEntry={isPassword ? !visible : secureTextEntry}
          {...props}
        />
        {isPassword ? (
          <Pressable style={styles.eyeButton} onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { gap: 6 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    inputWrap: { position: 'relative' },
    input: {
      height: 48,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      paddingHorizontal: 14,
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    inputWithIcon: { paddingRight: 44 },
    inputError: { borderColor: colors.danger },
    eyeButton: { position: 'absolute', right: 12, top: 0, height: 48, justifyContent: 'center' },
    error: { fontFamily: fonts.body, fontSize: 12, color: colors.dangerInk },
  });
}
