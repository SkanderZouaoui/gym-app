import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { fonts, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useDeleteAccount } from '../../src/hooks/useProfile';
import { tokenStorage } from '../../src/api/storage';
import { authApi } from '../../src/api/endpoints';
import { useSessionStore } from '../../src/store/session';

export default function AccountDeleteScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const clearSession = useSessionStore((s) => s.clear);
  const deleteAccount = useDeleteAccount();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    deleteAccount.mutate(password, {
      onSuccess: async () => {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
        await tokenStorage.clear();
        clearSession();
        router.replace('/(auth)/login');
      },
      onError: () => setError('Mot de passe incorrect.'),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Supprimer mon compte" fallbackHref="/(member)/settings" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.warningBox}>
          <MaterialIcons name="warning" size={28} color={colors.dangerInk} />
          <Text style={styles.warningTitle}>Cette action est définitive</Text>
          <Text style={styles.warningText}>
            La suppression de votre compte entraîne la perte de vos points de fidélité, votre historique de
            présence, vos réservations et vos messages. Votre abonnement en cours n’est pas annulé automatiquement
            — contactez l’accueil de votre salle si besoin.
          </Text>
        </View>

        <TextField
          label="Confirmez avec votre mot de passe"
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Supprimer définitivement mon compte"
          onPress={handleDelete}
          variant="secondary"
          loading={deleteAccount.isPending}
          disabled={!password}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: 120 },
    warningBox: {
      backgroundColor: colors.dangerSoft, borderRadius: 16, borderWidth: 1, borderColor: colors.danger,
      padding: spacing.md, gap: 8, alignItems: 'center',
    },
    warningTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.dangerInk },
    warningText: { fontFamily: fonts.body, fontSize: 13, color: colors.dangerInk, textAlign: 'center', lineHeight: 18 },
    error: { fontFamily: fonts.body, fontSize: 13, color: colors.dangerInk, textAlign: 'center' },
  });
}
