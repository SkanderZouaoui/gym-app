import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { tokenStorage } from '../../../src/api/storage';
import { authApi } from '../../../src/api/endpoints';
import { useSessionStore } from '../../../src/store/session';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { BottomSheet, ScreenTitle } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import { useTranslation } from 'react-i18next';
import i18n from '../../../src/i18n';

type Row = { icon: keyof typeof MaterialIcons.glyphMap; title: string; sub: string; href: string };

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    get title() { return i18n.t('admin.activite'); },
    rows: [{ icon: 'payments', get title() { return i18n.t('common.encaissements'); }, get sub() { return i18n.t('admin.historique_et_nouvel_encaissement'); }, href: '/(admin)/cash' }],
  },
  {
    get title() { return i18n.t('admin.contenu'); },
    rows: [{ icon: 'fitness-center', get title() { return i18n.t('common.programmes'); }, get sub() { return i18n.t('admin.validation_et_exercices'); }, href: '/(admin)/programs' }],
  },
  {
    get title() { return i18n.t('admin.communication'); },
    rows: [
      { icon: 'campaign', get title() { return i18n.t('admin.annonces'); }, get sub() { return i18n.t('admin.push_et_ecran_daccueil_adherent'); }, href: '/(admin)/announcements' },
      { icon: 'notifications', get title() { return i18n.t('common.notifications'); }, get sub() { return i18n.t('admin.envoyer_et_programmer'); }, href: '/(admin)/notifications' },
      { icon: 'notification-important', get title() { return i18n.t('admin.alertes_adherents'); }, get sub() { return i18n.t('admin.bandeaux_sur_laccueil_de_lapp'); }, href: '/(admin)/alerts' },
      { icon: 'tune', get title() { return i18n.t('admin.cfg_comms'); }, get sub() { return i18n.t('admin.cfg_comms_sub'); }, href: '/(admin)/settings?section=comms' },
    ],
  },
  {
    get title() { return i18n.t('admin.gestion_de_la_salle'); },
    rows: [
      { icon: 'badge', get title() { return i18n.t('admin.equipe'); }, get sub() { return i18n.t('admin.comptes_accueil_et_coachs'); }, href: '/(admin)/team' },
      { icon: 'card-membership', get title() { return i18n.t('admin.abonnements'); }, get sub() { return i18n.t('admin.forfaits_tarifs_et_remises'); }, href: '/(admin)/plans' },
      { icon: 'storefront', get title() { return i18n.t('admin.cfg_venue'); }, get sub() { return i18n.t('admin.cfg_venue_sub'); }, href: '/(admin)/settings?section=venue' },
      { icon: 'meeting-room', get title() { return i18n.t('admin.cfg_classes'); }, get sub() { return i18n.t('admin.cfg_classes_sub'); }, href: '/(admin)/settings?section=classes' },
      { icon: 'event-available', get title() { return i18n.t('admin.cfg_booking'); }, get sub() { return i18n.t('admin.cfg_booking_sub'); }, href: '/(admin)/settings?section=booking' },
      { icon: 'payments', get title() { return i18n.t('admin.cfg_payments'); }, get sub() { return i18n.t('admin.cfg_payments_sub'); }, href: '/(admin)/settings?section=payments' },
    ],
  },
  {
    get title() { return i18n.t('admin.mon_compte'); },
    rows: [
      { icon: 'person', get title() { return i18n.t('admin.profil_et_confidentialite'); }, get sub() { return i18n.t('admin.compte_securite_donnees'); }, href: '/(admin)/profile' },
      { icon: 'language', get title() { return i18n.t('admin.cfg_language'); }, get sub() { return i18n.t('admin.cfg_language_sub'); }, href: '/(admin)/settings?section=language' },
    ],
  },
];

/** Plus (admin) : accès aux fonctions d'accueil et d'administration. */
export default function AdminMoreScreen() {
  const { t } = useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const clearSession = useSessionStore((s) => s.clear);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const handleLogout = async () => {
    setLogoutVisible(false);
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await tokenStorage.clear();
    clearSession();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView {...tabBarScroll} contentContainerStyle={styles.container}>
        <ScreenTitle title={t('common.plus')} subtitle={t('admin.fonctions_daccueil_et_dadministration')} />
        {SECTIONS.map((section) => (
          <View key={section.title} style={{ gap: 8 }}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={{ gap: 10 }}>
              {section.rows.map((r) => (
                <Pressable
              key={r.title}
              style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push(r.href as never)}
            >
              <View style={styles.iconBox}>
                <MaterialIcons name={r.icon} size={24} color={colors.primaryInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text style={styles.cardSub}>{r.sub}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
              ))}
            </View>
          </View>
        ))}
                <Pressable style={styles.logout} onPress={() => setLogoutVisible(true)}>
          <MaterialIcons name="logout" size={22} color={colors.dangerInk} />
          <Text style={styles.logoutText}>{t('common.se_deconnecter')}</Text>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={logoutVisible} onClose={() => setLogoutVisible(false)}>
        <Text style={styles.sheetTitle}>{t('common.se_deconnecter_2')}</Text>
        <Text style={styles.sheetText}>{t('common.vous_devrez_vous_reconnecter_pour')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('common.se_deconnecter')} onPress={handleLogout} variant="danger" />
          <Button label={t('common.annuler')} onPress={() => setLogoutVisible(false)} variant="outline" />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginLeft: 4, marginTop: 6 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    cardSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, marginHorizontal: 4 },
    logout: {
      minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    logoutText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.dangerInk },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
  });
}
