import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { Banner } from '../../src/components/ui';
import { authApi } from '../../src/api/endpoints';
import { ApiError } from '../../src/api/client';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';

type Step = 'email' | 'code';

/** Mot de passe oublié — FitZone App Adherent.dc.html, A5. */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRequestCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setStep('code');
    } catch {
      setError(t('auth.impossible_denvoyer_le_code_reessayez'));
    } finally {
      setLoading(false);
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

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="" />
        <View style={styles.container}>
          <View style={[styles.iconCircle, { backgroundColor: colors.successSoft }]}>
            <MaterialIcons name="check-circle" size={34} color={colors.successInk} />
          </View>
          <Text style={styles.title}>{t('auth.mot_de_passe_mis_a')}</Text>
          <Text style={styles.subtitle}>{t('auth.vous_pouvez_maintenant_vous_connecter')}</Text>
          <Button label={t('auth.retour_a_la_connexion')} onPress={() => router.replace('/(auth)/login')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}>
            <MaterialIcons name="lock-reset" size={34} color={colors.primaryInk} />
          </View>
          <Text style={styles.title}>{t('auth.mot_de_passe_oublie')}</Text>

          {step === 'email' ? (
            <>
              <Text style={styles.subtitle}>{t('auth.saisissez_votre_e_mail_nous')}</Text>
              {error ? <Banner tone="danger" icon="error" text={error} /> : null}
              <TextField
                label={t('common.e_mail')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Button label={t('common.envoyer_le_code')} onPress={handleRequestCode} loading={loading} disabled={!email.trim()} />
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>{t('auth.entrez_le_code_recu_par')}</Text>
              {error ? <Banner tone="danger" icon="error" text={error} /> : null}
              <TextField
                label={t('common.code_recu')}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TextField label={t('common.nouveau_mot_de_passe')} value={newPassword} onChangeText={setNewPassword} isPassword />
              <Button
                label={t('common.reinitialiser_le_mot_de_passe')}
                onPress={handleResetPassword}
                loading={loading}
                disabled={code.trim().length !== 6 || newPassword.length < 8}
              />
            </>
          )}

          <Button label={t('auth.retour_a_la_connexion')} onPress={() => router.back()} variant="ghost" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function traduireErreur(code: string): string {
  switch (code) {
    case 'OTP_INVALID':
      return i18n.t('common.wrong_code');
    case 'OTP_EXPIRED':
      return i18n.t('common.ce_code_a_expire_demandez');
    default:
      return i18n.t('auth.impossible_de_reinitialiser_le_mot');
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
    iconCircle: {
      width: 64, height: 64, borderRadius: 16, backgroundColor: colors.primarySoft,
      alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg,
    },
    title: { fontFamily: fonts.head, fontSize: 28, color: colors.text },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginBottom: spacing.sm },
  });
}
