import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { StickyActionBar, STICKY_BAR_SPACE } from '../../src/components/ui/StickyActionBar';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useChangePassword } from '../../src/hooks/useProfile';
import { Banner, ScreenTitle } from '../../src/components/ui';
import { ApiError } from '../../src/api/client';

export default function AccountSecurityScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = !!currentPassword && newPassword.length >= 8 && newPassword === confirmPassword;
  const touched = !!(currentPassword || newPassword || confirmPassword);
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = () => {
    setError(null);
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (e) => setError(e instanceof ApiError ? traduireErreur(e.code) : 'Une erreur est survenue.'),
      },
    );
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/profile'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, touched && { paddingBottom: STICKY_BAR_SPACE + 20 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Profil</Text>
        </Pressable>
        <ScreenTitle title="Confidentialité" subtitle="Protégez votre compte et vos données" />

        <View style={styles.notice}>
          <View style={styles.noticeIcon}>
            <MaterialIcons name="shield" size={22} color={colors.primaryInk} />
          </View>
          <Text style={styles.noticeText}>Vos photos de profil et de progression restent privées : elles ne sont jamais partagées publiquement.</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Mot de passe</Text>
          <View style={[styles.card, cardShadow]}>
            {success ? <Banner tone="success" icon="check-circle" text="Mot de passe mis à jour." /> : null}
            {error ? <Banner tone="danger" icon="error" text={error} /> : null}

            <TextField label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} isPassword />
            <TextField label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} isPassword />
            <TextField
              label="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              error={mismatch ? 'Les mots de passe ne correspondent pas.' : undefined}
            />
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Données du compte</Text>
          <View style={[styles.card, cardShadow, { padding: 0, gap: 0 }]}>
            <Pressable style={styles.dangerRow} onPress={() => router.push('/(member)/account-delete')}>
              <View style={styles.dangerIcon}>
                <MaterialIcons name="delete-outline" size={22} color={colors.dangerInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerTitle}>Supprimer mon compte</Text>
                <Text style={styles.dangerSub}>Action définitive</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <StickyActionBar visible={touched} label="Mettre à jour le mot de passe" loading={changePassword.isPending} disabled={!canSubmit} onPress={handleSubmit} />
    </SafeAreaView>
  );
}

function traduireErreur(code: string): string {
  switch (code) {
    case 'INVALID_PASSWORD':
      return 'Mot de passe actuel incorrect.';
    default:
      return 'Une erreur est survenue.';
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySoft, borderRadius: 20, padding: 14 },
    noticeIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    noticeText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 19, color: colors.primaryInk },
    sectionTitle: {
      fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8,
      marginLeft: 6, marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: spacing.sm,
    },
    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 12 },
    dangerIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
    dangerTitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.dangerInk },
    dangerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  });
}
