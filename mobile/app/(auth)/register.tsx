import { useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { colors, fonts, spacing } from '../../src/theme/tokens';
import { authApi, meApi } from '../../src/api/endpoints';
import { tokenStorage } from '../../src/api/storage';
import { useSessionStore } from '../../src/store/session';
import { ApiError } from '../../src/api/client';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useSessionStore((s) => s.setSession);

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      const tokens = await authApi.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
      const user = await meApi.getMe();
      setSession(user, user.branchRoles, 'MEMBER');
      router.replace('/(member)');
    } catch (e) {
      setError(e instanceof ApiError ? traduireErreur(e.code) : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoins la communauté MuscleUP</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextField label="Prénom" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Nom" value={lastName} onChangeText={setLastName} />
              </View>
            </View>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="8 caractères minimum"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button label="S'inscrire" onPress={handleRegister} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <Link href="/(auth)/login" style={styles.footerLink}>
              Se connecter
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function traduireErreur(code: string): string {
  switch (code) {
    case 'EMAIL_OR_PHONE_ALREADY_USED':
      return 'Cet email est déjà utilisé';
    default:
      return "Impossible de créer le compte";
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xl },
  header: { gap: spacing.sm },
  title: { fontFamily: fonts.head, fontSize: 26, color: colors.secondary },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  errorText: { fontFamily: fonts.bodyMedium, color: colors.dangerInk, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerText: { fontFamily: fonts.body, color: colors.muted },
  footerLink: { fontFamily: fonts.bodyBold, color: colors.primaryInk },
});
