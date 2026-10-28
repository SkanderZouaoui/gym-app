import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { useMe, useMyBookings, useMyMemberships } from '../../../src/hooks/useMe';
import { useNotifications } from '../../../src/hooks/useProfile';
import { tokenStorage } from '../../../src/api/storage';
import { authApi } from '../../../src/api/endpoints';
import { useSessionStore } from '../../../src/store/session';
import { rootRouteForRole } from '../../../src/navigation/roleRoutes';
import { Banner, BottomSheet, IconCircleButton, OfflineBanner, Toast } from '../../../src/components/ui';
import { useNetworkStatusContext } from '../../../src/hooks/NetworkStatusContext';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { Button } from '../../../src/components/Button';
import { ProfileHeader } from '../../../src/components/adherent/ProfileHeader';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';

/** Écran Profil Adhérent — FitZone Profils.dc.html, 01. */
export default function ProfileScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  const { data: user, refetch: refetchMe } = useMe();
  const { data: memberships, refetch: refetchMemberships } = useMyMemberships();
  const { data: bookings, refetch: refetchBookings } = useMyBookings();
  const { data: notifications, refetch: refetchNotifications } = useNotifications();
  const roles = useSessionStore((s) => s.roles);
  const isDegraded = useSessionStore((s) => s.isDegraded);
  const setActiveRole = useSessionStore((s) => s.setActiveRole);
  const clearSession = useSessionStore((s) => s.clear);
  const { isOnline, lastSyncAt } = useNetworkStatusContext();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(() =>
    Promise.all([
      refetchMe(),
      refetchMemberships(),
      refetchBookings(),
      refetchNotifications(),
    ]),
  );
  const [logoutVisible, setLogoutVisible] = useState(false);

  const hasCoachRole = roles.some((r) => r === 'COACH');
  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

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

  const upcomingBookings = bookings?.filter(
    (b) => b.status === 'CONFIRMED' && b.session && new Date(b.session.startsAt).getTime() >= now,
  ).length ?? 0;
  const completion =
    [user?.firstName, user?.lastName, user?.email, user?.phone, user?.photoUrl].filter(Boolean).length / 5;
  const memberSince = user && memberships?.length
    ? new Date(Math.min(...memberships.map((m) => new Date(m.startDate).getTime())))
        .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : undefined;

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
      {!isOnline ? (
        <View style={styles.offlineBannerWrap}>
          <OfflineBanner lastSyncAt={lastSyncAt} />
        </View>
      ) : null}
      <ScrollView {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconCircleButton icon="qr-code-2" radius={14} onPress={() => router.push('/(member)/(tabs)/qr')} />
            <IconCircleButton icon="settings" radius={14} onPress={() => router.push('/(member)/settings')} />
          </View>
        </View>

        {isDegraded ? (
          <Banner
            tone="warning"
            icon="sync-problem"
            title="Session hors ligne"
            text="Vos informations n'ont pas pu être vérifiées en ligne récemment. Certaines données peuvent être obsolètes."
          />
        ) : null}

        <ProfileHeader
          initials={initials}
          photoUrl={user?.photoUrl}
          name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
          subtitle={memberSince ? t('profile.memberSince', { date: memberSince }) : undefined}
          completion={completion}
          tags={
            activeMembership
              ? [
                  { label: t('profile.active'), tone: 'success' },
                  ...(daysLeft > 0 ? [{ label: t('profile.daysLeftTag', { count: daysLeft }), tone: 'primary' as const }] : []),
                ]
              : [{ label: t('profile.none'), tone: 'muted' }]
          }
        />

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statValue}>{attendedThisMonth}</Text>
            <Text style={styles.statLabel}>{t('profile.statSessions')}</Text>
          </View>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statValue}>{upcomingBookings}</Text>
            <Text style={styles.statLabel}>{t('profile.statUpcoming')}</Text>
          </View>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statValue}>{activeMembership ? daysLeft : 0}</Text>
            <Text style={styles.statLabel}>{t('profile.statDaysLeft')}</Text>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction icon="qr-code-2" label={t('profile.quickQr')} primary onPress={() => router.push('/(member)/(tabs)/qr')} />
          <QuickAction icon="event-note" label={t('profile.quickBookings')} onPress={() => router.push('/(member)/reservations')} />
        </View>

        <Text style={styles.sectionTitle}>{t('profile.sectionAccount')}</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="badge" label={t('profile.menuPersonalInfo')} onPress={() => router.push('/(member)/profile-edit')} />
        </View>

        <Text style={styles.sectionTitle}>{t('profile.sectionPreferences')}</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="settings" label={t('profile.menuSettings')} onPress={() => router.push('/(member)/settings')} />
          <Divider />
          <MenuRow
            icon="notifications"
            label={t('profile.menuNotifications')}
            value={unreadCount > 0 ? String(unreadCount) : undefined}
            onPress={() => router.push('/(member)/notifications')}
          />
          <Divider />
          <MenuRow icon="lock-outline" label={t('profile.menuSecurity')} onPress={() => router.push('/(member)/account-security')} />
          <Divider />
          <MenuRow icon="help" label={t('profile.menuHelp')} onPress={() => router.push('/(member)/app-info')} />
        </View>

        {hasCoachRole ? (
          <>
            <Text style={styles.sectionTitle}>{t('profile.useAppAs')}</Text>
            <View style={styles.switchTrack}>
              <View style={[styles.switchSegment, styles.switchSegmentActive]}>
                <MaterialIcons name="person" size={18} color={colors.text} />
                <Text style={[styles.switchLabel, styles.switchLabelActive]}>{t('profile.roleMember')}</Text>
              </View>
              <Pressable style={styles.switchSegment} onPress={handleSwitchToCoach}>
                <MaterialIcons name="sports" size={18} color={colors.muted} />
                <Text style={styles.switchLabel}>{t('profile.roleCoach')}</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <Pressable style={styles.logoutButton} onPress={() => setLogoutVisible(true)}>
          <MaterialIcons name="logout" size={20} color={colors.dangerInk} />
          <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={logoutVisible} onClose={() => setLogoutVisible(false)}>
        <Text style={styles.sheetTitle}>{t('profile.logoutConfirmTitle')}</Text>
        <Text style={styles.sheetText}>{t('profile.logoutConfirmText')}</Text>
        <Pressable style={styles.sheetDangerButton} onPress={handleLogout}>
          <Text style={styles.sheetDangerButtonText}>{t('profile.logout')}</Text>
        </Pressable>
        <Button label={t('common.cancel')} onPress={() => setLogoutVisible(false)} variant="outline" />
      </BottomSheet>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text="Pas de connexion — impossible d’actualiser" iconColor={colors.warningInk} />
      ) : null}
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
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
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
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <MaterialIcons name={icon} size={22} color={colors.muted} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <MaterialIcons name={isRtl ? 'chevron-left' : 'chevron-right'} size={22} color={colors.muted} />
    </Pressable>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  const textAlign = isRtl ? 'right' as const : 'left' as const;
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    offlineBannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    header: { flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' },
    
    statsGrid: { flexDirection: 'row', gap: spacing.sm },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: radii.lg, paddingVertical: 16, paddingHorizontal: 12, gap: 8,
    },
    statValue: { fontFamily: fonts.head, fontSize: 34, lineHeight: 36, letterSpacing: -1.5, color: colors.text },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, lineHeight: 15 },

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
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: spacing.md,
    },
    menuLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.text, textAlign },
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
