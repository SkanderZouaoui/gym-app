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

type Row = { icon: keyof typeof MaterialIcons.glyphMap; title: string; sub: string; href: string };

const ROWS: Row[] = [
  { icon: 'payments', title: 'Encaissements', sub: 'Historique et nouvel encaissement', href: '/(admin)/cash' },
  { icon: 'fitness-center', title: 'Programmes', sub: 'Validation et exercices', href: '/(admin)/programs' },
  { icon: 'notification-important', title: 'Alertes adhérents', sub: 'Bandeaux sur l’accueil de l’app', href: '/(admin)/alerts' },
  { icon: 'card-membership', title: 'Abonnements', sub: 'Forfaits, tarifs et visibilité', href: '/(admin)/plans' },
  { icon: 'person', title: 'Profil et confidentialité', sub: 'Compte, sécurité, données', href: '/(admin)/profile' },
];

/** Plus (admin) : accès aux fonctions d'accueil et d'administration. */
export default function AdminMoreScreen() {
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
        <ScreenTitle title="Plus" subtitle="Fonctions d’accueil et d’administration" />
        <View style={{ gap: 10 }}>
          {ROWS.map((r) => (
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
        <Text style={styles.note}>La configuration complète (identité visuelle, horaires, règles) se gère depuis le back-office web.</Text>
        <Pressable style={styles.logout} onPress={() => setLogoutVisible(true)}>
          <MaterialIcons name="logout" size={22} color={colors.dangerInk} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={logoutVisible} onClose={() => setLogoutVisible(false)}>
        <Text style={styles.sheetTitle}>Se déconnecter ?</Text>
        <Text style={styles.sheetText}>Vous devrez vous reconnecter pour accéder à l’application.</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Se déconnecter" onPress={handleLogout} variant="secondary" />
          <Button label="Annuler" onPress={() => setLogoutVisible(false)} variant="outline" />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
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
