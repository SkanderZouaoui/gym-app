import { useEffect, useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Toast } from '../components/ui';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import type { SettingsRowDef } from '../components/adherent/ProfileSections';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useMe } from './useMe';
import { biometricAvailable, biometricName, confirmBiometric, disableBiometricLogin, enableBiometricLogin, isBiometricLoginEnabled } from '../auth/biometric';

/** Réglage « Connexion Face ID / empreinte » : une ligne pour SettingsGroup (null si l'appareil n'a pas de biométrie)
 * et la feuille qui demande le mot de passe à l'activation (vérifié auprès du serveur avant d'être gardé). */
export function useBiometricSetting(): { row: SettingsRowDef | null; overlay: ReactElement } {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: me } = useMe();
  const [available, setAvailable] = useState(false);
  const [name, setName] = useState('Face ID');
  const [enabled, setEnabled] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToastText] = useState<string | null>(null);
  const setToast = (text: string) => {
    setToastText(text);
    setTimeout(() => setToastText(null), 2500);
  };

  useEffect(() => {
    void (async () => {
      setAvailable(await biometricAvailable());
      setName(await biometricName());
      setEnabled(await isBiometricLoginEnabled());
    })();
  }, []);

  const close = () => {
    setSheet(false);
    setPassword('');
    setError(null);
  };

  const activate = async () => {
    const email = me?.email;
    if (!email || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Le mot de passe doit être le bon avant d'être gardé ; la session ouverte pour le tester est refermée aussitôt.
      const tokens = await authApi.login(email, password);
      await authApi.logout(tokens.refreshToken).catch(() => {});
      if (!(await confirmBiometric(t('biometric.prompt_enable')))) {
        setBusy(false);
        return;
      }
      await enableBiometricLogin(email, password);
      setEnabled(true);
      close();
      setToast(t('biometric.enabled_toast'));
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'INVALID_CREDENTIALS' ? t('biometric.wrong_password') : t('biometric.error'));
    } finally {
      setBusy(false);
    }
  };

  const row: SettingsRowDef | null = available && me?.email
    ? {
        kind: 'switch',
        icon: 'face',
        title: t('biometric.setting_title', { name }),
        sub: t('biometric.setting_sub'),
        value: enabled,
        onChange: (v) => {
          if (v) {
            setSheet(true);
          } else {
            void disableBiometricLogin().then(() => {
              setEnabled(false);
              setToast(t('biometric.disabled_toast'));
            });
          }
        },
      }
    : null;

  const overlay = (
    <>
      <BottomSheet visible={sheet} onClose={close}>
        <View style={{ gap: 14, paddingBottom: 8 }}>
          <Text style={{ fontFamily: fonts.head, fontSize: 22, color: colors.text }}>{t('biometric.enable_title', { name })}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted }}>{t('biometric.enable_text')}</Text>
          <TextField label={t('common.mot_de_passe')} value={password} onChangeText={setPassword} isPassword error={error ?? undefined} autoComplete="current-password" />
          <Button label={t('biometric.enable_confirm')} onPress={() => void activate()} loading={busy} disabled={password.length < 8} />
        </View>
      </BottomSheet>
      {toast ? <Toast icon="check-circle" text={toast} iconColor={colors.success} /> : null}
    </>
  );
  return { row, overlay };
}
