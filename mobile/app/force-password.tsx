import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { fonts } from '../src/theme/tokens';
import { AuthButton, AuthField, AuthScreen, Chip, DoneView, ErrorLine, LogoTile, PasswordRules, passwordChecks, useAuthPalette } from '../src/components/auth/AuthKit';
import { useChangePassword } from '../src/hooks/useProfile';
import { useSessionStore } from '../src/store/session';
import { pendingPassword } from '../src/auth/pendingPassword';
import { rootRouteForRole } from '../src/navigation/roleRoutes';
import { tokenStorage } from '../src/api/storage';
import { authApi } from '../src/api/endpoints';
import { ApiError } from '../src/api/client';
import { useTranslation } from 'react-i18next';

/** Première connexion avec un mot de passe provisoire : choix obligatoire d'un mot de passe personnel (refonte Login). */
export default function ForcePasswordScreen() {
  const { t } = useTranslation();
  const pal = useAuthPalette();
  const user = useSessionStore((s) => s.user);
  const roles = useSessionStore((s) => s.roles);
  const activeRole = useSessionStore((s) => s.activeRole);
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clear);
  const changePassword = useChangePassword();

  const [provided] = useState(() => pendingPassword.take());
  const [current, setCurrent] = useState(provided ?? '');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { count } = passwordChecks(next);
  const mismatch = confirm.length > 0 && next !== confirm;
  const match = next.length > 0 && next === confirm;
  const sameAsCurrent = next.length > 0 && next === current;
  const valid = current.length > 0 && count === 4 && match && !sameAsCurrent;

  const submit = () => {
    if (!valid) return;
    setError(null);
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          if (user && activeRole) setSession({ ...user, mustChangePassword: false }, roles, activeRole);
          setDone(true);
        },
        onError: (e) => {
          if (!(e instanceof ApiError)) return setError(t('common.connexion_impossible_verifiez_votre_reseau'));
          if (e.code === 'INVALID_PASSWORD') setError(t('common.le_mot_de_passe_provisoire'));
          else if (e.code === 'PASSWORD_UNCHANGED') setError(t('common.le_nouveau_mot_de_passe'));
          else if (e.status === 400) setError(t('common.le_nouveau_mot_de_passe_2'));
          else setError(t('common.impossible_de_modifier_le_mot'));
        },
      },
    );
  };

  const enter = () => (activeRole ? router.replace(rootRouteForRole(activeRole) as never) : router.replace('/'));

  const logout = async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await tokenStorage.clear();
    clearSession();
    router.replace('/(auth)/login');
  };

  return (
    <AuthScreen compact topRight={<LogoTile />}>
      {done ? (
        <DoneView title={t('auth.account_activated')} text={t('auth.account_activated_text')} button={t('auth.go_to_space')} onPress={enter} />
      ) : (
        <View>
          <Chip icon="shield" label={t('auth.first_login_chip')} />
          <Text style={{ fontFamily: fonts.head, fontSize: 26, letterSpacing: -0.8, lineHeight: 28, color: pal.fg, marginTop: 12 }}>
            {t('auth.welcome_name', { name: user?.firstName ?? '' })}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.mu, marginTop: 6 }}>{t('auth.first_login_sub')}</Text>

          <View style={{ gap: 10, marginTop: 16 }}>
            {!provided ? (
              <AuthField icon="key" secure value={current} onChangeText={setCurrent} placeholder={t('common.mot_de_passe_provisoire')} />
            ) : null}
            <AuthField icon="lock" secure value={next} onChangeText={setNext} placeholder={t('common.nouveau_mot_de_passe')} />
            <AuthField
              icon="lock-reset"
              secure
              value={confirm}
              onChangeText={setConfirm}
              placeholder={t('common.confirmer_le_mot_de_passe')}
              borderColor={mismatch ? '#EF4444' : match ? '#16A34A' : undefined}
            />
          </View>

          <PasswordRules password={next} />
          {mismatch ? <ErrorLine text={t('auth.passwords_differ')} /> : null}
          {sameAsCurrent ? <ErrorLine text={t('common.doit_etre_different_du_mot')} /> : null}
          {error ? <ErrorLine text={error} /> : null}

          <View style={{ marginTop: 16 }}>
            <AuthButton label={t('auth.activate_account')} onPress={submit} loading={changePassword.isPending} disabled={!valid} />
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.mu, textAlign: 'center', marginTop: 14 }}>{t('auth.provisional_stops')}</Text>
          <Pressable onPress={logout} style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: pal.mu }}>{t('common.se_deconnecter')}</Text>
          </Pressable>
        </View>
      )}
    </AuthScreen>
  );
}
