import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMe } from '../../src/hooks/useMe';
import { Button } from '../../src/components/Button';
import { tokenStorage } from '../../src/api/storage';
import { authApi } from '../../src/api/endpoints';
import { useSessionStore } from '../../src/store/session';

export default function ProfileScreen() {
  const { data: user } = useMe();
  const clearSession = useSessionStore((s) => s.clear);

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
      <View style={styles.container}>
        <Text style={styles.title}>Profil</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <InfoRow label="Rôle" value="Adhérent" />
          <InfoRow label="Téléphone" value={user?.phone ?? 'Non renseigné'} />
        </View>

        <Button label="Se déconnecter" onPress={handleLogout} variant="outline" />
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 10,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 999, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.headBold, color: colors.onAccent, fontSize: 18 },
  name: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
  email: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  infoValue: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
});
