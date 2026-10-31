import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { fonts } from '../../src/theme/tokens';
import { AuthButton, AuthField, AuthScreen, Chip, DoneView, ErrorLine, HeroButton, LogoTile, PasswordRules, passwordChecks, useAuthPalette } from '../../src/components/auth/AuthKit';
import { authApi } from '../../src/api/endpoints';
import { ApiError } from '../../src/api/client';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import * as Clipboard from 'expo-clipboard';
import { otpRateLimitMessage } from '../../src/utils/otpErrors';

type Step = 'email' | 'code';

/** Mot de passe oublié — FitZone App Adherent.dc.html, A5. */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const pal = useAuthPalette();
  // Lien profond de l'e-mail (muscleup://forgot-password?email=…&code=…) : préremplit et passe à l'étape du code.
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const linkedEmail = typeof params.email === 'string' ? params.email : '';
  const linkedCode = typeof params.code === 'string' && /^\d{6}$/.test(params.code) ? params.code : '';
  const fromLink = !!linkedEmail && !!linkedCode;
  const [step, setStep] = useState<Step>(fromLink ? 'code' : 'email');
  const [email, setEmail] = useState(linkedEmail);
  const [code, setCode] = useState(linkedCode);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRequestCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep('code');
    } catch (e) {
      setError(otpRateLimitMessage(e) ?? t('auth.impossible_denvoyer_le_code_reessayez'));
    } finally {
      setLoading(false);
    }
  };

  // Colle le code à 6 chiffres copié depuis l'e-mail (appui long sur le code), sans quitter l'écran.
  const pasteCode = async () => {
    try {
      const m = /\d{6}/.exec((await Clipboard.getStringAsync()).replace(/\s+/g, ''));
      if (m) setCode(m[0]);
    } catch {
      // presse-papiers indisponible : l'utilisateur peut saisir le code à la main
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), code.trim(), newPassword);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof ApiError ? traduireErreur(e.code) : t('auth.impossible_de_reinitialiser_le_mot'));
    } finally {
      setLoading(false);
    }
  };

  const { count } = passwordChecks(newPassword);
  const mismatch = confirm.length > 0 && newPassword !== confirm;
  const match = newPassword.length > 0 && newPassword === confirm;
  const valid = code.trim().length === 6 && count === 4 && match;
  const back = () => (step === 'code' && !success ? setStep('email') : router.canGoBack() ? router.back() : router.replace('/(auth)/login'));

  return (
    <AuthScreen compact topLeft={<HeroButton icon="arrow-back" onPress={back} />} topRight={<LogoTile />}>
      {success ? (
        <DoneView title={t('auth.mot_de_passe_mis_a')} text={t('auth.vous_pouvez_maintenant_vous_connecter')} button={t('auth.se_connecter')} onPress={() => router.replace('/(auth)/login')} />
      ) : step === 'email' ? (
        <View>
          <Chip icon="lock-reset" label={t('auth.forgot_chip')} />
          <Text style={{ fontFamily: fonts.head, fontSize: 26, letterSpacing: -0.8, lineHeight: 28, color: pal.fg, marginTop: 12 }}>{t('auth.mot_de_passe_oublie')}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.mu, marginTop: 6 }}>{t('auth.saisissez_votre_e_mail_nous')}</Text>
          <View style={{ marginTop: 16 }}>
            <AuthField icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder={t('common.e_mail')} autoComplete="email" onSubmitEditing={handleRequestCode} />
          </View>
          {error ? <ErrorLine text={error} /> : null}
          <View style={{ marginTop: 16 }}>
            <AuthButton label={t('common.envoyer_le_code')} onPress={handleRequestCode} loading={loading} disabled={!email.trim()} />
          </View>
          <Pressable onPress={() => router.replace('/(auth)/login')} style={{ height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: pal.accent }}>{t('auth.retour_a_la_connexion')}</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <Chip icon="mark-email-read" label={t('auth.code_sent_chip')} />
          <Text style={{ fontFamily: fonts.head, fontSize: 26, letterSpacing: -0.8, lineHeight: 28, color: pal.fg, marginTop: 12 }}>{t('common.nouveau_mot_de_passe')}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: pal.mu, marginTop: 6 }}>{t('auth.code_sent_sub', { email: email.trim() })}</Text>
          <View style={{ gap: 10, marginTop: 16 }}>
            <AuthField icon="pin" value={code} onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={6} placeholder={t('common.code_recu')} action={{ icon: 'content-paste', label: t('auth.paste_code'), onPress: pasteCode }} />
            <AuthField icon="lock" secure value={newPassword} onChangeText={setNewPassword} placeholder={t('common.nouveau_mot_de_passe')} />
            <AuthField icon="lock-reset" secure value={confirm} onChangeText={setConfirm} placeholder={t('common.confirmer_le_mot_de_passe')} borderColor={mismatch ? '#EF4444' : match ? '#16A34A' : undefined} />
          </View>
          <PasswordRules password={newPassword} />
          {mismatch ? <ErrorLine text={t('auth.passwords_differ')} /> : null}
          {error ? <ErrorLine text={error} /> : null}
          <View style={{ marginTop: 16 }}>
            <AuthButton label={t('auth.reset_action')} onPress={handleResetPassword} loading={loading} disabled={!valid} />
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: pal.mu, textAlign: 'center', marginTop: 14 }}>{t('auth.code_expired_hint')}</Text>
        </View>
      )}
    </AuthScreen>
  );
}

function traduireErreur(code: string): string {
  switch (code) {
    case 'OTP_INVALID':
      return i18n.t('common.wrong_code');
    case 'OTP_EXPIRED':
      return i18n.t('common.ce_code_a_expire_demandez');
    case 'OTP_TOO_MANY_ATTEMPTS':
      return i18n.t('common.otp_too_many_attempts');
    default:
      return i18n.t('auth.impossible_de_reinitialiser_le_mot');
  }
}
