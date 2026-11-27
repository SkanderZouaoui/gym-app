import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScreen } from '../../src/components/ui/KeyboardAwareScreen';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PasswordField } from '../../src/components/PasswordField';
import { passwordChecks } from '../../src/components/auth/AuthKit';
import { StickyActionBar, STICKY_BAR_SPACE } from '../../src/components/ui/StickyActionBar';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useChangePassword } from '../../src/hooks/useProfile';
import { Banner, ScreenTitle } from '../../src/components/ui';
import { ApiError } from '../../src/api/client';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { SectionHeader } from '../../src/components/ui/SectionHeader';

export default function AccountSecurityScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = !!currentPassword && passwordChecks(newPassword).count === 4 && newPassword === confirmPassword;
  const touched = !!(currentPassword || newPassword || confirmPassword);
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const { ok, count: met } = passwordChecks(newPassword);
  const rules = [
    { label: t('auth.rule_length'), ok: ok[0] },
    { label: t('auth.rule_upper'), ok: ok[1] },
    { label: t('auth.rule_digit'), ok: ok[2] },
    { label: t('auth.rule_symbol'), ok: ok[3] },
  ];
  const level = met >= 4 ? t('auth.level_strong') : met >= 2 ? t('auth.level_medium') : t('auth.level_weak');
  const levelColor = met >= 4 ? colors.success : met >= 2 ? colors.warning : colors.danger;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(met, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [met, progress]);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${(Math.max(progress.value, newPassword.length > 0 ? 0.35 : 0) / 4) * 100}%`,
    backgroundColor: interpolateColor(progress.value, [1, 2, 4], [colors.danger, colors.warning, colors.success]),
  }));

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
        onError: (e) => setError(e instanceof ApiError ? traduireErreur(e.code) : t('member.une_erreur_est_survenue')),
      },
    );
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/profile'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAwareScreen
        contentContainerStyle={[styles.container, touched && { paddingBottom: STICKY_BAR_SPACE + 20 }]}
        footer={<StickyActionBar visible={touched} label={t('member.mettre_a_jour_le_mot')} loading={changePassword.isPending} disabled={!canSubmit} onPress={handleSubmit} />}
      >
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.profil')}</Text>
        </Pressable>
        <ScreenTitle title={t('member.confidentialite')} subtitle={t('member.protegez_votre_compte_et_vos')} />

        <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.notice}>
          <View style={styles.noticeDecoA} />
          <View style={styles.noticeDecoB} />
          <View style={styles.shieldHalo}>
            <View style={styles.shieldCore}>
              <MaterialIcons name="verified-user" size={30} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.noticeText}>{t('member.vos_photos_de_profil_et')}</Text>
        </LinearGradient>

        <View>
          <SectionHeader title={t('common.mot_de_passe')} style={{ marginBottom: 10 }} />
          <View style={[styles.card, cardShadow]}>
            {success ? <Banner tone="success" icon="check-circle" text={t('member.mot_de_passe_mis_a')} /> : null}
            {error ? <Banner tone="danger" icon="error" text={error} /> : null}

            <PasswordField icon="lock-outline" label={t('member.mot_de_passe_actuel')} value={currentPassword} onChangeText={setCurrentPassword} autoComplete="current-password" />
            <View style={styles.divider} />
            <PasswordField icon="vpn-key" label={t('common.nouveau_mot_de_passe')} value={newPassword} onChangeText={setNewPassword} valid={met === 4} revealBelow={190} />
            {newPassword.length > 0 ? (
              <View style={styles.strength}>
                <View style={styles.strengthHead}>
                  <Text style={styles.strengthLabel}>{t('member.pw_strength')}</Text>
                  <View style={[styles.levelPill, { backgroundColor: levelColor + '22' }]}>
                    <Text style={[styles.strengthLevel, { color: levelColor }]}>{level}</Text>
                  </View>
                </View>
                <View style={styles.track}>
                  <Animated.View style={[styles.fill, fillStyle]} />
                </View>
                <View style={styles.rules}>
                  {rules.map((r) => (
                    <View key={r.label} style={[styles.rule, r.ok && styles.ruleOk]}>
                      <MaterialIcons name={r.ok ? 'check' : 'remove'} size={14} color={r.ok ? colors.successInk : colors.muted} />
                      <Text style={[styles.ruleText, r.ok && { color: colors.successInk }]}>{r.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            <PasswordField
              icon="verified-user"
              label={t('member.confirmer_le_nouveau_mot_de')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              valid={confirmPassword.length > 0 && !mismatch && met === 4}
              error={mismatch ? t('member.les_mots_de_passe_ne') : undefined}
            />
            {confirmPassword.length > 0 && !mismatch && newPassword.length > 0 ? (
              <View style={styles.matchRow}>
                <MaterialIcons name="check-circle" size={16} color={colors.successInk} />
                <Text style={styles.matchText}>{t('member.pw_match')}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View>
          <SectionHeader title={t('member.donnees_du_compte')} style={{ marginBottom: 10 }} />
          <View style={[styles.card, cardShadow, { padding: 0, gap: 0, borderColor: colors.dangerSoft }]}>
            <Pressable style={styles.dangerRow} onPress={() => router.push('/(member)/account-delete')}>
              <View style={styles.dangerIcon}>
                <MaterialIcons name="delete-outline" size={22} color={colors.dangerInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerTitle}>{t('common.supprimer_mon_compte')}</Text>
                <Text style={styles.dangerSub}>{t('member.action_definitive')}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

function traduireErreur(code: string): string {
  switch (code) {
    case 'INVALID_PASSWORD':
      return i18n.t('member.mot_de_passe_actuel_incorrect');
    case 'WEAK_PASSWORD':
      return i18n.t('auth.weak_password');
    default:
      return i18n.t('member.une_erreur_est_survenue');
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: radii.xl, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
    noticeDecoA: { position: 'absolute', right: -50, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' },
    noticeDecoB: { position: 'absolute', left: -30, bottom: -70, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)' },
    shieldHalo: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    shieldCore: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
    noticeText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13.5, lineHeight: 21, color: 'rgba(255,255,255,0.94)' },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginVertical: 2 },
    strength: { gap: 10, padding: 14, borderRadius: radii.md, backgroundColor: colors.surface2 },
    strengthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    strengthLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted },
    levelPill: { height: 24, paddingHorizontal: 10, borderRadius: 12, justifyContent: 'center' },
    strengthLevel: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
    track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3 },
    rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    rule: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    ruleOk: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
    ruleText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginStart: 4 },
    matchText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.successInk },
    sectionTitle: {
      fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8,
      marginLeft: 6, marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: spacing.md,
    },
    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 12 },
    dangerIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
    dangerTitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.dangerInk },
    dangerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  });
}
