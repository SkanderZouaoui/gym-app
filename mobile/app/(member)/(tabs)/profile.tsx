import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe, useMyBookings, useMyMemberships, useMyPoints, useMyStreak } from '../../../src/hooks/useMe';
import { useNotifications } from '../../../src/hooks/useProfile';
import { useBranches } from '../../../src/hooks/useBranches';
import { tokenStorage } from '../../../src/api/storage';
import { authApi } from '../../../src/api/endpoints';
import { useSessionStore } from '../../../src/store/session';
import { rootRouteForRole } from '../../../src/navigation/roleRoutes';
import { BottomSheet, IconCircleButton, Pill, ProgressBar } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';

/** Écran Profil Adhérent — FitZone Profils.dc.html, 01. */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const { data: memberships } = useMyMemberships();
  const { data: bookings } = useMyBookings();
  const { data: points } = useMyPoints();
  const { data: streak } = useMyStreak();
  const { data: notifications } = useNotifications();
  const { data: branches } = useBranches();
  const grants = useSessionStore((s) => s.grants);
  const setActiveRole = useSessionStore((s) => s.setActiveRole);
  const clearSession = useSessionStore((s) => s.clear);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const hasCoachRole = grants.some((g) => g.role === 'COACH');
  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const homeBranch = branches?.find((b) => b.id === user?.homeBranchId);

  const activeMembership = memberships?.find((m) => m.status === 'ACTIVE');
  const now = Date.now();
  const totalDays = activeMembership
    ? Math.max(1, Math.round((new Date(activeMembership.endDate).getTime() - new Date(activeMembership.startDate).getTime()) / 86_400_000))
    : 0;
  const elapsedDays = activeMembership
    ? Math.min(totalDays, Math.max(0, Math.round((now - new Date(activeMembership.startDate).getTime()) / 86_400_000)))
    : 0;
  const daysLeft = Math.max(0, totalDays - elapsedDays);

  const attendedThisMonth = bookings?.filter((b) => {
    if (b.status !== 'ATTENDED' || !b.attendedAt) return false;
    const d = new Date(b.attendedAt);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length ?? 0;

  const handleSwitchToCoach = () => {
    setActiveRole('COACH');
    router.replace(rootRouteForRole('COACH') as never);
  };

  const handleLogout = async () => {
    setLogoutVisible(false);
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
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconCircleButton icon="qr-code-2" onPress={() => router.push('/(member)/(tabs)/qr')} />
            <IconCircleButton icon="settings" onPress={() => router.push('/(member)/settings')} />
          </View>
        </View>

        <View style={styles.identityRow}>
          <View style={{ position: 'relative' }}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.firstName} {user?.lastName}
            </Text>
            <View style={styles.identityMetaRow}>
              <Pill label="Adhérent" tone="accent" />
              {homeBranch ? <Text style={styles.metaText} numberOfLines={1}>{homeBranch.name}</Text> : null}
            </View>
          </View>
          <Pressable style={styles.editButton} onPress={() => router.push('/(member)/profile-edit')}>
            <Text style={styles.editButtonText}>Modifier</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroKicker}>Mon abonnement</Text>
            <Pill label={activeMembership ? 'Actif' : 'Aucun'} tone={activeMembership ? 'success' : 'muted'} />
          </View>
          <View>
            <Text style={styles.heroTitle}>{activeMembership?.plan.name ?? 'Sans abonnement'}</Text>
            {activeMembership ? (
              <Text style={styles.heroSub}>
                Du {new Date(activeMembership.startDate).toLocaleDateString('fr-FR')} au{' '}
                {new Date(activeMembership.endDate).toLocaleDateString('fr-FR')}
              </Text>
            ) : (
              <Text style={styles.heroSub}>Souscrivez une formule à l’accueil pour accéder à la salle.</Text>
            )}
          </View>
          {activeMembership ? (
            <>
              <ProgressBar
                progress={totalDays ? elapsedDays / totalDays : 0}
                color={colors.primary}
                trackColor="rgba(255,255,255,0.2)"
              />
              <View style={styles.heroBottomRow}>
                <Text style={styles.heroBottomText}>Jour {elapsedDays} sur {totalDays}</Text>
                <Text style={styles.heroBottomText}>
                  {daysLeft > 0 ? `Renouveler avant le ${new Date(activeMembership.endDate).toLocaleDateString('fr-FR')}` : 'Expiré'}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{attendedThisMonth}</Text>
            <Text style={styles.statLabel}>séances ce mois-ci</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{streak?.streak ?? 0}</Text>
            <Text style={styles.statLabel}>semaines d’affilée</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{points?.points ?? 0}</Text>
            <Text style={styles.statLabel}>points fidélité</Text>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction icon="qr-code-2" label="Mon QR" primary onPress={() => router.push('/(member)/(tabs)/qr')} />
          <QuickAction icon="event-note" label="Réservations" onPress={() => router.push('/(member)/reservations')} />
          <QuickAction icon="emoji-events" label="Fidélité" onPress={() => router.push('/(member)/loyalty')} />
          <QuickAction icon="card-giftcard" label="Parrainer" onPress={() => router.push('/(member)/referral')} />
        </View>

        <Text style={styles.sectionTitle}>Mon compte</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="badge" label="Infos personnelles" onPress={() => router.push('/(member)/profile-edit')} />
          <Divider />
          <MenuRow icon="sports" label="Coaching" onPress={() => router.push('/(member)/coaching')} />
          <Divider />
          <MenuRow icon="forum" label="Communauté" onPress={() => router.push('/(member)/community')} />
          <Divider />
          <MenuRow icon="storefront" label="Boutique" onPress={() => router.push('/(member)/shop')} />
        </View>

        <Text style={styles.sectionTitle}>Préférences</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="settings" label="Paramètres" onPress={() => router.push('/(member)/settings')} />
          <Divider />
          <MenuRow
            icon="notifications"
            label="Notifications"
            value={unreadCount > 0 ? String(unreadCount) : undefined}
            onPress={() => router.push('/(member)/notifications')}
          />
          <Divider />
          <MenuRow icon="lock-outline" label="Confidentialité & sécurité" onPress={() => router.push('/(member)/account-security')} />
          <Divider />
          <MenuRow icon="help" label="Aide & infos pratiques" onPress={() => router.push('/(member)/app-info')} />
        </View>

        {hasCoachRole ? (
          <>
            <Text style={styles.sectionTitle}>Utiliser l’app en tant que</Text>
            <View style={styles.switchTrack}>
              <View style={[styles.switchSegment, styles.switchSegmentActive]}>
                <MaterialIcons name="person" size={18} color={colors.text} />
                <Text style={[styles.switchLabel, styles.switchLabelActive]}>Adhérent</Text>
              </View>
              <Pressable style={styles.switchSegment} onPress={handleSwitchToCoach}>
                <MaterialIcons name="sports" size={18} color={colors.muted} />
                <Text style={styles.switchLabel}>Coach</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <Pressable style={styles.logoutButton} onPress={() => setLogoutVisible(true)}>
          <MaterialIcons name="logout" size={20} color={colors.dangerInk} />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={logoutVisible} onClose={() => setLogoutVisible(false)}>
        <Text style={styles.sheetTitle}>Se déconnecter ?</Text>
        <Text style={styles.sheetText}>
          Votre QR hors ligne sera supprimé de ce téléphone. Vous devrez vous reconnecter pour réserver ou pointer.
        </Text>
        <Pressable style={styles.sheetDangerButton} onPress={handleLogout}>
          <Text style={styles.sheetDangerButtonText}>Se déconnecter</Text>
        </Pressable>
        <Button label="Annuler" onPress={() => setLogoutVisible(false)} variant="outline" />
      </BottomSheet>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  primary,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      style={[styles.quickAction, primary ? styles.quickActionPrimary : styles.quickActionDefault]}
      onPress={onPress}
    >
      <MaterialIcons name={icon} size={24} color={primary ? colors.primaryContrast : colors.text} />
      <Text style={[styles.quickActionLabel, { color: primary ? colors.primaryContrast : colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function MenuRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <MaterialIcons name={icon} size={22} color={colors.muted} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: fonts.head, fontSize: 28, color: colors.text },

    identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    avatar: {
      width: 72, height: 72, borderRadius: 999, backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarImage: { width: 72, height: 72, borderRadius: 999, backgroundColor: colors.surface2 },
    avatarText: { fontFamily: fonts.head, color: colors.onAccent, fontSize: 24 },
    name: { fontFamily: fonts.headBold, fontSize: 22, color: colors.text },
    identityMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
    metaText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    editButton: {
      height: 36, paddingHorizontal: 12, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.borderStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    editButtonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },

    heroCard: {
      backgroundColor: colors.secondary, borderRadius: radii.lg, padding: spacing.md, gap: 10,
    },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroKicker: {
      fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase',
      color: colors.onSecondary, opacity: 0.85,
    },
    heroTitle: { fontFamily: fonts.headBold, fontSize: 22, color: colors.onSecondary },
    heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.onSecondary, opacity: 0.85, marginTop: 2 },
    heroBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
    heroBottomText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.onSecondary, opacity: 0.9 },

    statsGrid: { flexDirection: 'row', gap: spacing.sm },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: radii.md, padding: 12, gap: 2,
    },
    statValue: { fontFamily: fonts.headBold, fontSize: 22, color: colors.text },
    statLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted, lineHeight: 15 },

    quickGrid: { flexDirection: 'row', gap: 6 },
    quickAction: {
      flex: 1, minHeight: 72, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', gap: 4,
      paddingHorizontal: 4, borderWidth: 1,
    },
    quickActionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    quickActionDefault: { backgroundColor: colors.surface, borderColor: colors.border },
    quickActionLabel: { fontFamily: fonts.bodyBold, fontSize: 11.5, textAlign: 'center' },

    sectionTitle: {
      fontFamily: fonts.bodySemiBold, fontSize: 12, letterSpacing: 0.5, color: colors.muted,
      textTransform: 'uppercase', marginTop: spacing.xs,
    },
    menuCard: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: spacing.md,
    },
    menuLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.text },
    menuValue: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.primaryInk },

    switchTrack: {
      flexDirection: 'row', padding: 3, borderRadius: radii.sm, backgroundColor: colors.surface2, gap: 3,
    },
    switchSegment: {
      flex: 1, height: 42, borderRadius: radii.sm - 2, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 6,
    },
    switchSegmentActive: {
      backgroundColor: colors.surface,
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    switchLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.muted },
    switchLabelActive: { color: colors.text },

    logoutButton: {
      height: 48, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.dangerSoft,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    logoutButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.dangerInk },

    sheetTitle: { fontFamily: fonts.headBold, fontSize: 22, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, lineHeight: 20 },
    sheetDangerButton: {
      height: 48, borderRadius: radii.sm, backgroundColor: colors.danger,
      alignItems: 'center', justifyContent: 'center',
    },
    sheetDangerButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#FFFFFF' },
  });
}
