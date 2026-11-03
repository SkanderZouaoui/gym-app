import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts } from '../../src/theme/tokens';
import { AuthButton, AuthErrorBanner, AuthField, AuthScreen, LogoTile, useAuthPalette } from '../../src/components/auth/AuthKit';
import { authApi, meApi } from '../../src/api/endpoints';
import { tokenStorage } from '../../src/api/storage';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '../../src/store/session';
import { ApiError } from '../../src/api/client';
import { pendingPassword } from '../../src/auth/pendingPassword';
import { rootRouteForRole } from '../../src/navigation/roleRoutes';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_LABELS } from '../../src/i18n';
import { LanguageSheet } from '../../src/components/LanguageSheet';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useNetworkStatusContext } from '../../src/hooks/NetworkStatusContext';

/** Écran de connexion — FitZone App Adherent.dc.html, A3. */
export default function LoginScreen() {
  const { t } = useTranslation();
  const pal = useAuthPalette();
  const { language } = useLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { isOnline } = useNetworkStatusContext();
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();

  // Réseau revenu après un échec « pas de connexion » : la bannière n'a plus lieu d'être.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current) setFailure((f) => (f?.kind === 'network' ? null : f));
    wasOnline.current = isOnline;
  }, [isOnline]);

  const handleLogin = async () => {
    if (loading || success) return;
    setFailure(null);
    setLoading(true);
    try {
      const tokens = await authApi.login(email.trim(), password);
      // Données en cache d'un autre compte (profil, réservations…) : on repart de zéro.
      queryClient.clear();
      await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
      const user = await meApi.getMe();
      const roles = user.roles.map((r) => r.role);
      const activeRole = roles[0] ?? 'MEMBER';
      // Le bouton passe au vert (coche, onde) un court instant avant d'ouvrir l'application.
      setLoading(false);
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 1300));
      setSession(user, roles, activeRole);
      if (user.mustChangePassword) {
        pendingPassword.set(password);
        router.replace('/force-password');
        return;
      }
      router.replace(rootRouteForRole(activeRole) as any);
    } catch (e) {
      // À chaque échec : le bouton réagit (voile rouge, haptique) et la bannière explique la cause.
      setShakeTrigger((n) => n + 1);
      setAttempt((n) => n + 1);
      setFailure(classifierEchec(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthScreen
        topRight={<LogoTile />}
      >
        <Text style={{ fontFamily: fonts.head, fontSize: 28, letterSpacing: -0.8, lineHeight: 30, color: pal.fg }}>{t('auth.bon_retour')}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.mu, marginTop: 6 }}>{t('auth.login_subtitle')}</Text>

        <View style={{ gap: 12, marginTop: 16 }}>
          {failure ? <AuthErrorBanner tone={failure.kind === 'network' ? 'warning' : 'danger'} icon={failure.icon} title={failure.title} message={failure.message} attempt={attempt} /> : null}
          <AuthField icon="mail" value={email} onChangeText={(v) => { setEmail(v); setFailure(null); }} keyboardType="email-address" placeholder={t('auth.id_placeholder')} autoComplete="email" />
          <AuthField
            icon="lock"
            secure
            value={password}
            onChangeText={(v) => { setPassword(v); setFailure(null); }}
            placeholder={t('common.mot_de_passe')}
            borderColor={failure?.kind === 'credentials' ? '#EF4444' : undefined}
            onSubmitEditing={handleLogin}
          />
        </View>

        <View style={{ alignItems: 'flex-end', marginTop: 6, marginBottom: 6 }}>
          <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={6} style={{ paddingVertical: 10 }}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: pal.accent }}>{t('auth.mot_de_passe_oublie_2')}</Text>
          </Pressable>
        </View>

        <AuthButton label={loading ? t('auth.connexion') : t('auth.se_connecter')} successLabel={t('auth.connecte')} onPress={handleLogin} loading={loading} success={success} shakeTrigger={shakeTrigger} disabled={!email.trim() || !password} />
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.mu, textAlign: 'center', marginTop: 14 }}>{t('auth.no_self_signup')}</Text>

        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: 24 }}>
          <Pressable
            onPress={() => setLanguageOpen(true)}
            accessibilityLabel={t('common.langue')}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: pal.sf, borderWidth: 1.5, borderColor: pal.bd }, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="language" size={20} color={pal.accent} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: pal.fg }}>{LANGUAGE_LABELS[language]}</Text>
            <MaterialIcons name="expand-more" size={20} color={pal.mu} />
          </Pressable>
        </View>
      </AuthScreen>
      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </>
  );
}

type FailureKind = 'credentials' | 'format' | 'rate' | 'server' | 'network' | 'unknown';
interface LoginFailure {
  kind: FailureKind;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  message: string;
}

/** Cause de l'échec de connexion, avec un titre et un message dédiés (identifiants, format, trop d'essais,
 * serveur indisponible, pas de réseau…). */
function classifierEchec(e: unknown): LoginFailure {
  const mk = (kind: FailureKind, icon: LoginFailure['icon'], key: string): LoginFailure => ({
    kind, icon, title: i18n.t(`auth.err_${key}_title`), message: i18n.t(`auth.err_${key}_text`),
  });
  // `fetch` lève une TypeError quand le réseau est coupé ; toute autre exception inattendue n'est pas un problème de réseau.
  if (e instanceof TypeError) return mk('network', 'wifi-off', 'network');
  if (!(e instanceof ApiError)) return mk('unknown', 'error-outline', 'unknown');
  if (e.code === 'INVALID_CREDENTIALS') return mk('credentials', 'lock-person', 'credentials');
  if (e.code === 'BAD_REQUEST') return mk('format', 'alternate-email', 'format');
  if (e.status === 429) return mk('rate', 'hourglass-top', 'rate');
  if (e.status >= 500) return mk('server', 'cloud-off', 'server');
  return mk('unknown', 'error-outline', 'unknown');
}
