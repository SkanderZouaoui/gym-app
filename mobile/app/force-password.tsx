import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../src/theme/tokens';
import { useTheme } from '../src/theme/ThemeContext';
import { TextField } from '../src/components/TextField';
import { Banner } from '../src/components/ui';
import { useChangePassword } from '../src/hooks/useProfile';
import { useSessionStore } from '../src/store/session';
import { pendingPassword } from '../src/auth/pendingPassword';
import { rootRouteForRole } from '../src/navigation/roleRoutes';
import { tokenStorage } from '../src/api/storage';
import { authApi } from '../src/api/endpoints';
import { ApiError } from '../src/api/client';
import { useTranslation } from 'react-i18next';
import i18n from '../src/i18n';

function strength(pwd: string): { score: number; label: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]|[A-Za-z]/.test(pwd)) score++;
  return { score, label: i18n.t(`common.strength_${score}`) };
}

/** Première connexion avec un mot de passe provisoire : choix obligatoire d'un mot de passe personnel. */
export default function ForcePasswordScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const user = useSessionStore((s) => s.user);
  const roles = useSessionStore((s) => s.roles);
  const activeRole = useSessionStore((s) => s.activeRole);
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clear);
  const changePassword = useChangePassword();

  const [current, setCurrent] = useState(() => pendingPassword.take() ?? '');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const st = strength(next);
  const mismatch = confirm.length > 0 && next !== confirm;
  const sameAsCurrent = next.length > 0 && next === current;
  const valid = current.length > 0 && next.length >= 8 && next === confirm && !sameAsCurrent;
  const barColors = [colors.danger, colors.danger, colors.warning, colors.success, colors.success];

  const submit = () => {
    setError(null);
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          if (user && activeRole) {
            setSession({ ...user, mustChangePassword: false }, roles, activeRole);
            router.replace(rootRouteForRole(activeRole) as never);
          } else {
            router.replace('/');
          }
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

  const logout = async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await tokenStorage.clear();
    clearSession();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
              <MaterialIcons name="lock-reset" size={38} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.eyebrow}>{t('common.premiere_connexion')}</Text>
            <Text style={styles.title}>{t('common.bienvenue', { v1: user ? `, ${user.firstName}` : '' })}</Text>
            <Text style={styles.sub}>{t('common.pour_securiser_votre_compte_remplacez')}</Text>
          </View>

          {error ? <Banner tone="danger" icon="error" text={error} /> : null}

          <View style={[styles.card, cardShadow]}>
            <TextField label={t('common.mot_de_passe_provisoire')} value={current} onChangeText={setCurrent} isPassword autoCapitalize="none" />
            <TextField
              label={t('common.nouveau_mot_de_passe')}
              value={next}
              onChangeText={setNext}
              isPassword
              autoCapitalize="none"
              error={sameAsCurrent ? t('common.doit_etre_different_du_mot') : undefined}
            />
            {next.length > 0 ? (
              <View style={{ gap: 6 }}>
                <View style={styles.bars}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={[styles.bar, { backgroundColor: i < st.score ? barColors[st.score] : colors.surface2 }]} />
                  ))}
                </View>
                <Text style={styles.strengthText}>{t('common.securite', { label: st.label })}</Text>
              </View>
            ) : null}
            <TextField
              label={t('common.confirmer_le_mot_de_passe')}
              value={confirm}
              onChangeText={setConfirm}
              isPassword
              autoCapitalize="none"
              error={mismatch ? t('common.les_mots_de_passe_ne') : undefined}
            />
          </View>

          <View style={styles.rules}>
            <Rule ok={next.length >= 8} text={t('common.8_caracteres_minimum')} />
            <Rule ok={/[A-Z]/.test(next) && /[a-z]/.test(next)} text={t('common.majuscules_et_minuscules_conseille')} />
            <Rule ok={/\d/.test(next)} text={t('common.au_moins_un_chiffre_conseille')} />
          </View>

          <Pressable
            onPress={submit}
            disabled={!valid || changePassword.isPending}
            style={({ pressed }) => [styles.ctaShadow, (!valid || changePassword.isPending) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaText}>{changePassword.isPending ? t('common.enregistrement') : t('common.enregistrer_et_continuer')}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={logout} style={styles.logout}>
            <Text style={styles.logoutText}>{t('common.se_deconnecter')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <MaterialIcons name={ok ? 'check-circle' : 'radio-button-unchecked'} size={18} color={ok ? colors.successInk : colors.muted} />
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: ok ? colors.text : colors.muted }}>{text}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: 40 },
    hero: { alignItems: 'center', gap: 8, paddingVertical: 8 },
    heroIcon: { width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.4, color: colors.primaryInk },
    title: { fontFamily: fonts.head, fontSize: 30, letterSpacing: -1, color: colors.text, textAlign: 'center' },
    sub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center', maxWidth: 320 },
    card: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    bars: { flexDirection: 'row', gap: 6 },
    bar: { flex: 1, height: 5, borderRadius: 3 },
    strengthText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    rules: { gap: 8, paddingHorizontal: 4 },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    logout: { height: 46, alignItems: 'center', justifyContent: 'center' },
    logoutText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.muted },
  });
}
