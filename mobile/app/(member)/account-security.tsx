import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useChangePassword } from '../../src/hooks/useProfile';
import { Banner } from '../../src/components/ui';
import { ApiError } from '../../src/api/client';

export default function AccountSecurityScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = () => {
    setError(null);
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (e) => setError(e instanceof ApiError ? traduireErreur(e.code) : 'Une erreur est survenue.'),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Confidentialité" fallbackHref="/(member)/(tabs)/profile" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Mot de passe</Text>
        <View style={styles.card}>
          {success ? (
            <Banner tone="success" icon="check-circle" text="Mot de passe mis à jour." />
          ) : null}
          {error ? <Banner tone="danger" icon="error" text={error} /> : null}

          <TextField label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} isPassword />
          <TextField label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} isPassword />
          <TextField
            label="Confirmer le nouveau mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
            error={mismatch ? 'Les mots de passe ne correspondent pas.' : undefined}
          />
          <Button
            label="Mettre à jour le mot de passe"
            onPress={handleSubmit}
            loading={changePassword.isPending}
            disabled={!currentPassword || newPassword.length < 8 || mismatch || newPassword !== confirmPassword}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function traduireErreur(code: string): string {
  switch (code) {
    case 'INVALID_PASSWORD':
      return 'Mot de passe actuel incorrect.';
    default:
      return 'Une erreur est survenue.';
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
    sectionTitle: {
      fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted, textTransform: 'uppercase',
      letterSpacing: 0.4, marginTop: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: spacing.sm,
    },
  });
}
