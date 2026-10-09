import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMe } from '../../src/hooks/useMe';
import { tokenStorage } from '../../src/api/storage';
import { authApi } from '../../src/api/endpoints';
import { useSessionStore } from '../../src/store/session';

const ITEMS: { icon: keyof typeof MaterialIcons.glyphMap; label: string; description: string }[] = [
  { icon: 'payments', label: 'Encaissements', description: 'Enregistrer un paiement, historique' },
  { icon: 'campaign', label: 'Annonces', description: 'Notification push ciblée' },
  { icon: 'flag', label: 'Modération', description: 'Signalements à traiter' },
  { icon: 'notifications-active', label: 'Alertes', description: 'Abonnements expirants, cours sous-remplis' },
];

export default function AdminMoreScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const clearSession = useSessionStore((s) => s.clear);

  const handleLogout = async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await tokenStorage.clear();
    clearSession();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Plus</Text>
        <Text style={styles.subtitle}>
          {user?.firstName} {user?.lastName} · Admin
        </Text>
      </View>
      <View style={styles.list}>
        {ITEMS.map((item) => (
          <Pressable key={item.label} style={styles.card}>
            <View style={styles.iconBox}>
              <MaterialIcons name={item.icon} size={22} color={colors.primaryInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
        ))}
        <View style={styles.divider} />
        <Text style={styles.footerNote}>
          La configuration complète (formules, règles multi-sites, branding) se gère depuis le back-office web.
        </Text>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { padding: spacing.lg, paddingBottom: spacing.sm },
    title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondaryInk },
    subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 4 },
    list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    iconBox: {
      width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
    cardDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
    footerNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center' },
    logoutButton: {
      height: 48, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.borderStrong,
      alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm,
    },
    logoutText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  });
}
