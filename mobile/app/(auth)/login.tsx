import { useMemo, useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { fonts, spacing, typography } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { authApi, meApi } from '../../src/api/endpoints';
import { tokenStorage } from '../../src/api/storage';
import { useSessionStore } from '../../src/store/session';
import { ApiError } from '../../src/api/client';
import { pendingPassword } from '../../src/auth/pendingPassword';
import { rootRouteForRole } from '../../src/navigation/roleRoutes';
import { Banner } from '../../src/components/ui';

/** Écran de connexion — FitZone App Adherent.dc.html, A3. */
export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const setSession = useSessionStore((s) => s.setSession);

  const handleLogin = async () => {
    setError(null);
    setOffline(false);
    setLoading(true);
    try {
      const tokens = await authApi.login(email.trim(), password);
      await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
      const user = await meApi.getMe();
      const roles = user.roles.map((r) => r.role);
      const activeRole = roles[0] ?? 'MEMBER';
      setSession(user, roles, activeRole);
      if (user.mustChangePassword) {
        pendingPassword.set(password);
        router.replace('/force-password');
        return;
      }
      router.replace(rootRouteForRole(activeRole) as any);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(traduireErreur(e.code));
      } else {
        setOffline(true);
      }
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
            <Text style={styles.title}>Bon retour</Text>
            <Text style={styles.subtitle}>Connectez-vous pour réserver vos cours.</Text>
          </View>

          <View style={styles.form}>
            {error ? <Banner tone="danger" icon="error" text={error} /> : null}
            {offline ? (
              <Banner tone="warning" icon="wifi-off" text="Pas de connexion. La connexion reprendra dès que le réseau revient." />
            ) : null}

            <TextField
              label="E-mail"
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
              isPassword
              placeholder="••••••••"
              error={error ?? undefined}
            />
            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              Mot de passe oublié ?
            </Link>
            <Button label={loading ? 'Connexion…' : 'Se connecter'} onPress={handleLogin} loading={loading} disabled={offline} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <Link href="/(auth)/register" style={styles.footerLink}>
              Créer un compte
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
      return 'E-mail ou mot de passe incorrect.';
    case 'BAD_REQUEST':
      return 'Vérifiez le format de votre e-mail et votre mot de passe (8 caractères minimum).';
    default:
      return 'Impossible de se connecter. Réessayez dans quelques instants.';
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xl },
    header: { alignItems: 'flex-start', gap: spacing.sm },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    logoText: { fontFamily: fonts.head, color: colors.primaryContrast, fontSize: 22, letterSpacing: -0.5 },
    title: { ...typography.largeTitle, fontSize: 32, color: colors.text },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    form: { gap: spacing.md },
    forgotLink: { fontFamily: fonts.bodySemiBold, color: colors.primaryInk, fontSize: 14, alignSelf: 'flex-start' },
    footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
    footerText: { fontFamily: fonts.body, color: colors.muted },
    footerLink: { fontFamily: fonts.bodyBold, color: colors.primaryInk },
  });
}
