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
import { rootRouteForRole } from '../../src/navigation/roleRoutes';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useSessionStore((s) => s.setSession);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const tokens = await authApi.login(email.trim(), password);
      await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
      const user = await meApi.getMe();
      const activeRole = user.branchRoles[0]?.role ?? 'MEMBER';
      setSession(user, user.branchRoles, activeRole);
      router.replace(rootRouteForRole(activeRole) as any);
    } catch (e) {
      setError(e instanceof ApiError ? traduireErreur(e.code) : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>MU</Text>
            </View>
            <Text style={styles.title}>MuscleUP</Text>
            <Text style={styles.subtitle}>Connecte-toi pour continuer</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="toi@exemple.com"
            />
            <TextField
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button label="Se connecter" onPress={handleLogin} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <Link href="/(auth)/register" style={styles.footerLink}>
              S'inscrire
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function traduireErreur(code: string): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Email ou mot de passe incorrect';
    default:
      return 'Impossible de se connecter';
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: { fontFamily: fonts.head, color: colors.primaryContrast, fontSize: 18 },
  title: { fontFamily: fonts.head, fontSize: 28, color: colors.secondary },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  form: { gap: spacing.md },
  errorText: { fontFamily: fonts.bodyMedium, color: colors.dangerInk, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerText: { fontFamily: fonts.body, color: colors.muted },
  footerLink: { fontFamily: fonts.bodyBold, color: colors.primaryInk },
});
