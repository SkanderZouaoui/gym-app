import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts } from '../../src/theme/tokens';
import { AuthButton, AuthField, AuthScreen, ErrorLine, LogoTile, useAuthPalette } from '../../src/components/auth/AuthKit';
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
  const pal = useAuthPalette();
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
    <>
      <AuthScreen
        topRight={<LogoTile />}
      >
        <Text style={{ fontFamily: fonts.head, fontSize: 28, letterSpacing: -0.8, lineHeight: 30, color: pal.fg }}>{t('auth.bon_retour')}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.mu, marginTop: 6 }}>{t('auth.login_subtitle')}</Text>

        <View style={{ gap: 12, marginTop: 16 }}>
          {offline ? <Banner tone="warning" icon="wifi-off" text={t('auth.pas_de_connexion_la_connexion')} /> : null}
          <AuthField icon="mail" value={email} onChangeText={(v) => { setEmail(v); setError(null); }} keyboardType="email-address" placeholder={t('auth.id_placeholder')} autoComplete="email" />
          <AuthField
            icon="lock"
            secure
            value={password}
            onChangeText={(v) => { setPassword(v); setError(null); }}
            placeholder={t('common.mot_de_passe')}
            borderColor={error && !password ? '#EF4444' : undefined}
            onSubmitEditing={handleLogin}
          />
        </View>
        {error ? <ErrorLine text={error} /> : null}

        <View style={{ alignItems: 'flex-end', marginTop: 6, marginBottom: 6 }}>
          <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={6} style={{ paddingVertical: 10 }}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: pal.accent }}>{t('auth.mot_de_passe_oublie_2')}</Text>
          </Pressable>
        </View>

        <AuthButton label={loading ? t('auth.connexion') : t('auth.se_connecter')} onPress={handleLogin} loading={loading} disabled={offline || !email.trim() || !password} />
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
