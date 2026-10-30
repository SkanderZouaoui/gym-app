import { useMemo, useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { fonts, spacing, typography } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { authApi, meApi } from '../../src/api/endpoints';
import { tokenStorage } from '../../src/api/storage';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '../../src/store/session';
import { ApiError } from '../../src/api/client';
import { pendingPassword } from '../../src/auth/pendingPassword';
import { rootRouteForRole } from '../../src/navigation/roleRoutes';
import { Banner } from '../../src/components/ui';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { LanguageSheet } from '../../src/components/LanguageSheet';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { LANGUAGE_LABELS } from '../../src/i18n';

/** Écran de connexion — FitZone App Adherent.dc.html, A3. */
export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { language } = useLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();

  const handleLogin = async () => {
    setError(null);
    setOffline(false);
    setLoading(true);
    try {
      const tokens = await authApi.login(email.trim(), password);
      // Données en cache d'un autre compte (profil, réservations…) : on repart de zéro.
      queryClient.clear();
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
          <Pressable style={styles.langButton} onPress={() => setLanguageOpen(true)} hitSlop={8} accessibilityLabel={t('common.langue')}>
            <MaterialIcons name="language" size={18} color={colors.primaryInk} />
            <Text style={styles.langText}>{LANGUAGE_LABELS[language]}</Text>
          </Pressable>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>{t('common.mu')}</Text>
            </View>
            <Text style={styles.title}>{t('auth.bon_retour')}</Text>
            <Text style={styles.subtitle}>{t('auth.connectez_vous_pour_reserver_vos')}</Text>
          </View>

          <View style={styles.form}>
            {error ? <Banner tone="danger" icon="error" text={error} /> : null}
            {offline ? (
              <Banner tone="warning" icon="wifi-off" text={t('auth.pas_de_connexion_la_connexion')} />
            ) : null}

            <TextField
              label={t('common.e_mail')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('auth.toi_exemple_com')}
            />
            <TextField
              label={t('common.mot_de_passe')}
              value={password}
              onChangeText={setPassword}
              isPassword
              placeholder="••••••••"
              error={error ?? undefined}
            />
            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>{t('auth.mot_de_passe_oublie_2')}</Link>
            <Button label={loading ? t('auth.connexion') : t('auth.se_connecter')} onPress={handleLogin} loading={loading} disabled={offline} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.pas_encore_de_compte')}</Text>
            <Link href="/(auth)/register" style={styles.footerLink}>{t('common.creer_un_compte')}</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </SafeAreaView>
  );
}

function traduireErreur(code: string): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return i18n.t('auth.e_mail_ou_mot_de');
    case 'BAD_REQUEST':
      return i18n.t('auth.verifiez_le_format_de_votre');
    default:
      return i18n.t('auth.impossible_de_se_connecter_reessayez');
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    langButton: {
      alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18,
      backgroundColor: colors.primarySoft,
    },
    langText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
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
