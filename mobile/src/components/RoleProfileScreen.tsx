import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ProfileHeader } from './adherent/ProfileHeader';
import { SettingsGroup } from './adherent/ProfileSections';
import { ApiError } from '../api/client';
import { useMe } from '../hooks/useMe';
import { useMySchedule, shiftHours, WEEK_DAYS } from '../hooks/useAdmin';
import { useUpdateProfile } from '../hooks/useProfile';
import { useSessionStore } from '../store/session';
import { tokenStorage } from '../api/storage';
import { authApi } from '../api/endpoints';
import { BottomSheet, Toast } from './ui';
import { StickyActionBar, STICKY_BAR_SPACE } from './ui/StickyActionBar';
import { Button } from './Button';
import { rootRouteForRole } from '../navigation/roleRoutes';
import { useHideTabBarOnScroll } from '../hooks/useHideTabBarOnScroll';
import { useTranslation } from 'react-i18next';
import { LanguageSheet } from './LanguageSheet';
import { LANGUAGE_LABELS } from '../i18n';
import { useProfilePhoto } from '../hooks/useProfilePhoto';
import { useOfflineAwareRefresh } from '../hooks/useOfflineAwareRefresh';

type IconName = keyof typeof MaterialIcons.glyphMap;

/** Profil v2 des espaces coach / accueil / admin : identité, spécialités (coach), coordonnées modifiables, sécurité, données du compte. */
export function RoleProfileScreen({ roleLabel }: { roleLabel: string }) {
  const { t } = useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow, preference, setScheme } = useTheme();
  const { language } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user, refetch: refetchMe } = useMe();
  const updateProfile = useUpdateProfile();
  const { data: mySchedule, refetch: refetchSchedule } = useMySchedule();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetchMe(), refetchSchedule()]));
  const workingDays = (mySchedule ?? []).filter((d) => d.working);
  const roles = useSessionStore((s) => s.roles);
  const setActiveRole = useSessionStore((s) => s.setActiveRole);
  const clearSession = useSessionStore((s) => s.clear);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);

  // Les champs se remplissent une seule fois depuis le profil chargé.
  useEffect(() => {
    if (!user) return;
    setFullName(`${user.firstName} ${user.lastName}`.trim());
    setPhone(user.phone ?? '');
  }, [user]);

  const dirty = !!user && (fullName.trim() !== `${user.firstName} ${user.lastName}`.trim() || phone.trim() !== (user.phone ?? ''));
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const hasMemberRole = roles.some((r) => r === 'MEMBER');
  const specialties = user?.specialties ?? [];

  const showToast = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 2500);
  };
  const { onPressAvatar, uploading: photoUploading, localPhotoUri, controls: photoControls } = useProfilePhoto({
    onSuccess: () => showToast(t('common.profil_enregistre')),
    onError: (message) => showToast(message, false),
  });

  const handleSave = () => {
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    if (!firstName) return;
    updateProfile.mutate(
      { firstName, lastName: rest.join(' ') || user?.lastName || '', phone: phone.trim() || undefined },
      {
        onSuccess: () => showToast(t('common.profil_enregistre')),
        onError: (e) =>
          showToast(
            e instanceof ApiError && e.code === 'PHONE_ALREADY_USED'
              ? t('common.ce_numero_de_telephone_est')
              : t('common.impossible_denregistrer_le_profil_reessayez'),
            false,
          ),
      },
    );
  };

  const handleLogout = async () => {
    setLogoutVisible(false);
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await tokenStorage.clear();
    clearSession();
    router.replace('/(auth)/login');
  };

  const handleSwitchToMember = () => {
    setActiveRole('MEMBER');
    router.replace(rootRouteForRole('MEMBER') as never);
  };

  const contactRows: { icon: IconName; label: string; value: string; onChange?: (v: string) => void; placeholder: string; keyboardType?: 'default' | 'phone-pad'; verified?: boolean }[] = [
    { icon: 'badge', label: t('common.nom_complet'), value: fullName, onChange: setFullName, placeholder: t('common.nom') },
    { icon: 'mail-outline', label: t('common.email'), value: user?.email ?? '', placeholder: t('common.email_salle_fr'), verified: !!user?.email },
    { icon: 'call', label: t('common.telephone'), value: phone, onChange: setPhone, placeholder: '06 00 00 00 00', keyboardType: 'phone-pad' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView {...tabBarScroll} contentContainerStyle={[styles.container, dirty && { paddingBottom: STICKY_BAR_SPACE + 40 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ProfileHeader
          initials={initials}
          photoUrl={user?.photoUrl}
          localPhotoUri={localPhotoUri}
          onEditPhoto={onPressAvatar}
          photoUploading={photoUploading}
          name={user ? `${user.firstName} ${user.lastName}` : ''}
          subtitle={user?.email ?? undefined}
          completion={[user?.firstName, user?.email, user?.phone, user?.photoKey].filter(Boolean).length / 4}
          tags={[{ label: roleLabel, tone: 'primary' }, { label: t('common.compte_actif'), tone: 'success' }]}
        />

        {workingDays.length > 0 ? (
          <View>
            <Text style={styles.groupTitle}>{t('common.mon_planning')}</Text>
            <View style={[styles.card, cardShadow, { paddingHorizontal: 16 }]}>
              {workingDays.map((d, i) => (
                <View key={d.dayOfWeek} style={[styles.navRow, { minHeight: 48 }, i < workingDays.length - 1 && styles.rowBorder]}>
                  <Text style={[styles.navTitle, { width: 96 }]}>{WEEK_DAYS[d.dayOfWeek]}</Text>
                  <Text style={[styles.navSub, { flex: 1, fontSize: 14 }]}>{d.startTime} – {d.endTime}</Text>
                  <Text style={styles.navTitle}>{shiftHours(d)} h</Text>
                </View>
              ))}
            </View>
            <Text style={styles.hint}>{t('common.h_par_semaine_defini_par', { v1: Math.round(workingDays.reduce((sum, d) => sum + shiftHours(d), 0) * 10) / 10 })}</Text>
          </View>
        ) : null}

        {specialties.length > 0 ? (
          <View>
            <Text style={styles.groupTitle}>{t('common.specialites')}</Text>
            <View style={styles.chips}>
              {specialties.map((s) => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <Text style={styles.groupTitle}>{t('common.coordonnees')}</Text>
          <View style={[styles.card, cardShadow, { padding: 6 }]}>
            {contactRows.map((r, i) => (
              <View key={r.label} style={[styles.contactRow, i < contactRows.length - 1 && styles.rowBorder]}>
                <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.contactIcon}>
                  <MaterialIcons name={r.icon} size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.contactLabelRow}>
                    <Text style={styles.contactLabel}>{r.label.toUpperCase()}</Text>
                    {r.verified ? (
                      <View style={styles.verified}>
                        <MaterialIcons name="check" size={12} color={colors.successInk} />
                        <Text style={styles.verifiedText}>{t('common.verifie')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <TextInput
                    value={r.value}
                    onChangeText={r.onChange}
                    editable={!!r.onChange}
                    placeholder={r.placeholder}
                    placeholderTextColor={colors.muted}
                    keyboardType={r.keyboardType}
                    autoCapitalize={r.keyboardType ? 'none' : 'words'}
                    style={[styles.contactInput, !r.onChange && { color: colors.muted }]}
                  />
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>{t('common.ces_informations_servent_a_vous')}</Text>
        </View>

        <SettingsGroup
          title={t('common.apparence')}
          rows={[
            {
              kind: 'segment',
              icon: 'contrast',
              title: t('common.theme'),
              options: [
                { value: 'light', label: t('common.clair') },
                { value: 'dark', label: t('common.sombre') },
                { value: 'system', label: t('common.auto') },
              ],
              selected: preference,
              onChange: (v) => setScheme(v as 'light' | 'dark' | 'system'),
            },
          ]}
        />

        <SettingsGroup
          title={t('common.compte')}
          rows={[
            { kind: 'nav', icon: 'language', title: t('common.langue'), value: LANGUAGE_LABELS[language], onPress: () => setLanguageVisible(true) },
            { kind: 'nav', icon: 'lock-outline', title: t('common.mot_de_passe'), onPress: () => router.push('/(member)/account-security') },
            ...(hasMemberRole ? [{ kind: 'nav' as const, icon: 'swap-horiz' as const, title: t('common.passer_en_mode_adherent'), onPress: handleSwitchToMember }] : []),
            { kind: 'nav', icon: 'delete-outline', title: t('common.supprimer_mon_compte'), onPress: () => router.push('/(member)/account-delete') },
          ]}
        />

        <Pressable style={({ pressed }) => [styles.logout, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => setLogoutVisible(true)}>
          <MaterialIcons name="logout" size={22} color={colors.dangerInk} />
          <Text style={[styles.logoutText, { color: colors.dangerInk }]}>{t('common.se_deconnecter')}</Text>
        </Pressable>
      </ScrollView>

      <StickyActionBar visible={dirty} aboveTabBar label={t('common.enregistrer_le_profil')} loading={updateProfile.isPending} onPress={handleSave} />

      {photoControls}

      <LanguageSheet visible={languageVisible} onClose={() => setLanguageVisible(false)} />

      <BottomSheet visible={logoutVisible} onClose={() => setLogoutVisible(false)}>
        <Text style={styles.sheetTitle}>{t('common.se_deconnecter_2')}</Text>
        <Text style={styles.sheetText}>{t('common.vous_devrez_vous_reconnecter_pour')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('common.se_deconnecter')} onPress={handleLogout} variant="danger" />
          <Button label={t('common.annuler')} onPress={() => setLogoutVisible(false)} variant="outline" />
        </View>
      </BottomSheet>

      {offlineToastVisible ? <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} /> : null}
      {toast ? <Toast icon={toast.ok ? 'check-circle' : 'error'} text={toast.text} iconColor={toast.ok ? colors.success : colors.danger} /> : null}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140, paddingTop: spacing.sm },
    header: { alignItems: 'center', gap: 6, paddingTop: 8, paddingBottom: 6 },
    avatarShadow: {
      width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: colors.primary, padding: 4,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
      backgroundColor: colors.bg,
    },
    avatar: { flex: 1, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: fonts.head, fontSize: 30, letterSpacing: -0.9, color: '#FFFFFF' },
    name: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -1, color: colors.text, marginTop: 10, textAlign: 'center' },
    rolePill: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    rolePillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
    groupTitle: {
      fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted, textTransform: 'uppercase', marginLeft: 4, marginBottom: 8,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    contactIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    contactLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    contactLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5, color: colors.muted },
    verified: {
      flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.successSoft,
    },
    verifiedText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.successInk },
    contactInput: { height: 30, padding: 0, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 8, marginLeft: 6 },
    navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
    navTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
    navSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    dangerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
    switchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16, borderRadius: 18,
      backgroundColor: colors.primarySoft,
    },
    switchText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    ctaShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 6,
    },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    langRow: { minHeight: 54, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
    logout: {
      minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    logoutText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
  });
}
