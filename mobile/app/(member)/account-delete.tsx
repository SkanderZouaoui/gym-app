import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { fonts, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useDeleteAccount } from '../../src/hooks/useProfile';
import { tokenStorage } from '../../src/api/storage';
import { authApi } from '../../src/api/endpoints';
import { useSessionStore } from '../../src/store/session';
import { useTranslation } from 'react-i18next';

export default function AccountDeleteScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.warningBox}>
          <MaterialIcons name="warning" size={28} color={colors.dangerInk} />
          <Text style={styles.warningTitle}>{t('member.cette_action_est_definitive')}</Text>
          <Text style={styles.warningText}>{t('member.la_suppression_de_votre_compte')}</Text>
        </View>

        <TextField
          label={t('member.confirmez_avec_votre_mot_de')}
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={t('member.supprimer_definitivement_mon_compte')}
          onPress={handleDelete}
          variant="secondary"
          loading={deleteAccount.isPending}
          disabled={!password}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: 120 },
    warningBox: {
      backgroundColor: colors.dangerSoft, borderRadius: 16, borderWidth: 1, borderColor: colors.danger,
      padding: spacing.md, gap: 8, alignItems: 'center',
    },
    warningTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.dangerInk },
    warningText: { fontFamily: fonts.body, fontSize: 13, color: colors.dangerInk, textAlign: 'center', lineHeight: 18 },
    error: { fontFamily: fonts.body, fontSize: 13, color: colors.dangerInk, textAlign: 'center' },
  });
}
