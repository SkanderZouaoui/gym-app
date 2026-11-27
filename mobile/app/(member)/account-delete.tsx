import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { PasswordField } from '../../src/components/PasswordField';
import { KeyboardAwareScreen } from '../../src/components/ui/KeyboardAwareScreen';
import { Button } from '../../src/components/Button';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useDeleteAccount } from '../../src/hooks/useProfile';
import { disableBiometricLogin } from '../../src/auth/biometric';
import { unregisterPush } from '../../src/notifications/push';
import { tokenStorage } from '../../src/api/storage';
import { authApi } from '../../src/api/endpoints';
import { useSessionStore } from '../../src/store/session';
import { useTranslation } from 'react-i18next';

export default function AccountDeleteScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const clearSession = useSessionStore((s) => s.clear);
  const deleteAccount = useDeleteAccount();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    deleteAccount.mutate(password, {
      onSuccess: async () => {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
        await unregisterPush();
        await disableBiometricLogin();
        await tokenStorage.clear();
        clearSession();
        router.replace('/(auth)/login');
      },
      onError: () => setError(t('member.mot_de_passe_incorrect')),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={t('common.supprimer_mon_compte')} fallbackHref="/(member)/account-security" />
      <KeyboardAwareScreen contentContainerStyle={styles.container}>
        <LinearGradient colors={['#DC2626', '#7F1D1D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.warningBox}>
          <View style={styles.decoA} />
          <View style={styles.decoB} />
          <View style={styles.halo}>
            <View style={styles.haloCore}>
              <MaterialIcons name="delete-forever" size={30} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.warningTitle}>{t('member.cette_action_est_definitive')}</Text>
          <Text style={styles.warningText}>{t('member.la_suppression_de_votre_compte')}</Text>
        </LinearGradient>

        <View style={[styles.card, cardShadow]}>
          <PasswordField
            icon="lock-outline"
            label={t('member.confirmez_avec_votre_mot_de')}
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            error={error ?? undefined}
          />
        </View>

        <View style={styles.actions}>
          <Button
            label={t('member.supprimer_definitivement_mon_compte')}
            onPress={handleDelete}
            variant="danger"
            loading={deleteAccount.isPending}
            disabled={!password}
          />
          <Button label={t('common.annuler')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(member)/account-security'))} variant="ghost" />
        </View>
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: 120 },
    warningBox: { borderRadius: radii.xl, padding: 22, gap: 8, alignItems: 'center', overflow: 'hidden' },
    decoA: { position: 'absolute', right: -50, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' },
    decoB: { position: 'absolute', left: -40, bottom: -70, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)' },
    halo: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    haloCore: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
    warningTitle: { fontFamily: fonts.headBold, fontSize: 19, letterSpacing: -0.3, color: '#FFFFFF', textAlign: 'center' },
    warningText: { fontFamily: fonts.body, fontSize: 13.5, color: 'rgba(255,255,255,0.88)', textAlign: 'center', lineHeight: 20 },
    card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    actions: { gap: spacing.sm },
  });
}
