import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe } from '../../../src/hooks/useMe';
import { useSessionStore } from '../../../src/store/session';
import { tokenStorage } from '../../../src/api/storage';
import { authApi } from '../../../src/api/endpoints';
import { Avatar, Pill } from '../../../src/components/ui';
import { rootRouteForRole } from '../../../src/navigation/roleRoutes';

/** Profil Coach — FitZone App Coach.dc.html, N4. */
export default function CoachProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const grants = useSessionStore((s) => s.grants);
  const setActiveRole = useSessionStore((s) => s.setActiveRole);
  const clearSession = useSessionStore((s) => s.clear);

  const hasMemberRole = grants.some((g) => g.role === 'MEMBER');

  const handleSwitchToMember = () => {
    setActiveRole('MEMBER');
    router.replace(rootRouteForRole('MEMBER') as never);
  };

  const handleLogout = async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {});
    }
    await tokenStorage.clear();
    clearSession();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profil</Text>

        <View style={styles.identityCard}>
          <Avatar initials={`${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()} size={64} background={colors.accent} color={colors.onAccent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
            <Pill label="Coach" tone="secondary" />
          </View>
        </View>

        {hasMemberRole ? (
          <Pressable style={styles.switchRow} onPress={handleSwitchToMember}>
            <MaterialIcons name="swap-horiz" size={20} color={colors.primaryInk} />
            <Text style={styles.switchText}>Passer en mode adhérent</Text>
          </Pressable>
        ) : null}

        <View style={styles.menu}>
          <MenuRow icon="schedule" label="Mes disponibilités" />
          <MenuRow icon="inbox" label="Demandes de séances" />
          <MenuRow icon="notifications" label="Notifications" />
          <MenuRow icon="translate" label="Langue" value="Français" />
        </View>

        <Pressable style={styles.logoutRow} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={colors.dangerInk} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.menuRow}>
      <MaterialIcons name={icon} size={20} color={colors.muted} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    title: { fontFamily: fonts.head, fontSize: 24, color: colors.text },
    identityCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text, marginBottom: 4 },
    switchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft,
      borderRadius: radii.sm, padding: spacing.md,
    },
    switchText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.primaryInk },
    menu: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    },
    menuRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    menuLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    menuValue: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md },
    logoutText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.dangerInk },
  });
}
