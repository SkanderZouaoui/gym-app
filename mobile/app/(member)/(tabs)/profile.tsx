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
import { Banner, BottomSheet, OfflineBanner, Toast } from '../../../src/components/ui';
import { useNetworkStatusContext } from '../../../src/hooks/NetworkStatusContext';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { Button } from '../../../src/components/Button';
import { ProfileHeader } from '../../../src/components/adherent/ProfileHeader';
import {
  ProfileActivity,
  ProfileBadges,
  ProfileStats,
  SettingsGroup,
  type BadgeInfo,
} from '../../../src/components/adherent/ProfileSections';
import { useMyWorkouts } from '../../../src/hooks/useCoaching';
import { usePreferencesStore } from '../../../src/store/preferences';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';

/** Écran Profil Adhérent — FitZone Profils.dc.html, 01. */
export default function ProfileScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, preference, setScheme } = useTheme();
  const { t } = useTranslation();
  const prefs = usePreferencesStore();
  const { data: workouts, refetch: refetchWorkouts } = useMyWorkouts();
  const { isRtl, language, setLanguage } = useLanguage();
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
      refetchWorkouts(),
    ]),
  );
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);

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

  // Activité = séances d'entraînement enregistrées + cours collectifs suivis.
  const activityDates = useMemo(() => {
    const dates: Date[] = (workouts ?? []).map((w) => new Date(w.date));
    for (const b of bookings ?? []) {
      if (b.status === 'ATTENDED' && b.session) dates.push(new Date(b.session.startsAt));
    }
    return dates;
  }, [workouts, bookings]);
  const totalSessions = activityDates.length;
  const weekStart = (d: Date) => {
    const x = new Date(d);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const currentWeek = weekStart(new Date());
  const weekCounts = useMemo(() => {
    const counts = Array<number>(8).fill(0);
    for (const d of activityDates) {
      const diff = Math.round((currentWeek - weekStart(d)) / (7 * 86_400_000));
      if (diff >= 0 && diff < 8) counts[7 - diff]++;
    }
    return counts;
  }, [activityDates, currentWeek]);
  const assiduity = Math.round((weekCounts.filter((c) => c > 0).length / 8) * 100);
  const streakWeeks = (() => {
    let i = weekCounts.length - 1;
    if (i >= 0 && weekCounts[i] === 0) i--; // la semaine en cours, encore vide, n'interrompt pas la série
    let n = 0;
    while (i >= 0 && weekCounts[i] > 0) {
      n++;
      i--;
    }
    return n;
  })();
  const GOAL_TARGET = 16;
  const monthSessions = activityDates.filter((d) => {
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;
  const memberMonths = memberships?.length
    ? (Date.now() - Math.min(...memberships.map((m) => new Date(m.startDate).getTime()))) / (30 * 86_400_000)
    : 0;
  const badges: BadgeInfo[] = [
    { icon: 'local-fire-department', label: 'Série 4 sem.', unlocked: streakWeeks >= 4 },
    { icon: 'bolt', label: 'Premier cours', unlocked: totalSessions >= 1 },
    { icon: 'workspace-premium', label: '3 mois', unlocked: memberMonths >= 3 },
    { icon: 'emoji-events', label: '50 séances', unlocked: totalSessions >= 50 },
    { icon: 'diamond', label: '100 séances', unlocked: totalSessions >= 100 },
    { icon: 'military-tech', label: 'Assidu 90 %', unlocked: assiduity >= 90 },
  ];
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
          memberCode={user?.memberCode ?? undefined}
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

        <ProfileStats
          stats={[
            { label: 'Séances', value: totalSessions },
            { label: 'Assiduité', value: assiduity, unit: '%' },
            { label: 'Série', value: streakWeeks, unit: ' sem.' },
          ]}
        />

        <ProfileActivity weeks={weekCounts} goalDone={monthSessions} goalTarget={GOAL_TARGET} />

        <View>
          <Text style={styles.sectionHeading}>Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ProfileBadges badges={badges} />
          </ScrollView>
        </View>

        <SettingsGroup
          title="Apparence"
          rows={[
            {
              kind: 'segment',
              icon: 'contrast',
              title: 'Thème',
              options: [
                { value: 'light', label: 'Clair' },
                { value: 'dark', label: 'Sombre' },
                { value: 'system', label: 'Auto' },
              ],
              selected: preference,
              onChange: (v) => setScheme(v as 'light' | 'dark' | 'system'),
            },
          ]}
        />

        <SettingsGroup
          title="Notifications"
          rows={[
            {
              kind: 'switch',
              icon: 'notifications-active',
              title: 'Alerte d’expiration',
              sub: '7 jours avant l’échéance',
              value: prefs.expiryAlert,
              onChange: (v) => prefs.set({ expiryAlert: v }),
            },
            {
              kind: 'switch',
              icon: 'event',
              title: 'Rappels de cours',
              sub: '1 heure avant',
              value: prefs.classReminder,
              onChange: (v) => prefs.set({ classReminder: v }),
            },
            {
              kind: 'nav',
              icon: 'notifications',
              title: t('profile.menuNotifications'),
              value: unreadCount > 0 ? String(unreadCount) : undefined,
              onPress: () => router.push('/(member)/notifications'),
            },
          ]}
        />

        <SettingsGroup
          title="Accessibilité"
          rows={[
            {
              kind: 'switch',
              icon: 'motion-photos-off',
              title: 'Réduire les animations',
              sub: 'Désactive transitions et effets',
              value: prefs.reduceMotion,
              onChange: (v) => prefs.set({ reduceMotion: v }),
            },
          ]}
        />

        <SettingsGroup
          title="Compte"
          rows={[
            {
              kind: 'nav',
              icon: 'badge',
              title: 'Abonnement',
              value: activeMembership?.plan.name ?? t('profile.none'),
              onPress: () => router.push('/(member)/subscription'),
            },
            { kind: 'nav', icon: 'person', title: 'Informations personnelles', onPress: () => router.push('/(member)/profile-edit') },
            { kind: 'nav', icon: 'language', title: 'Langue', value: language === 'ar' ? 'العربية' : 'Français', onPress: () => setLanguageVisible(true) },
          ]}
        />

        <SettingsGroup
          title="Plus"
          rows={[
            { kind: 'nav', icon: 'event-note', title: 'Mes réservations', onPress: () => router.push('/(member)/reservations') },
            { kind: 'nav', icon: 'lock-outline', title: t('profile.menuSecurity'), onPress: () => router.push('/(member)/account-security') },
            { kind: 'nav', icon: 'help', title: t('profile.menuHelp'), onPress: () => router.push('/(member)/app-info') },
            ...(hasCoachRole
              ? [{ kind: 'nav' as const, icon: 'sports' as const, title: 'Utiliser l’app en tant que coach', onPress: handleSwitchToCoach }]
              : []),
          ]}
        />

        <Pressable style={({ pressed }) => [styles.logoutButton, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => setLogoutVisible(true)}>
          <MaterialIcons name="logout" size={22} color={colors.dangerInk} />
          <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={languageVisible} onClose={() => setLanguageVisible(false)}>
        <Text style={styles.sheetTitle}>Langue</Text>
        <View style={styles.languageList}>
          {([
            { value: 'fr', label: 'Français' },
            { value: 'ar', label: 'العربية' },
          ] as const).map((l) => {
            const active = language === l.value;
            return (
              <Pressable
                key={l.value}
                style={[styles.languageRow, active && styles.languageRowActive]}
                onPress={() => {
                  setLanguage(l.value);
                  setLanguageVisible(false);
                }}
              >
                <Text style={[styles.languageText, active && styles.languageTextActive]}>{l.label}</Text>
                {active ? <MaterialIcons name="check" size={22} color={colors.primaryInk} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

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

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  void isRtl;
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    offlineBannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    sectionHeading: { fontFamily: fonts.head, fontSize: 20, letterSpacing: -0.4, color: colors.text, marginTop: spacing.sm, marginBottom: 12 },
    logoutButton: {
      minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6,
    },
    logoutButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.dangerInk },
    languageList: { gap: 8, marginTop: spacing.sm, marginBottom: spacing.sm },
    languageRow: {
      minHeight: 54, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
    },
    languageRowActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
    languageText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    languageTextActive: { color: colors.primaryInk, fontFamily: fonts.bodyBold },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
    sheetDangerButton: {
      height: 52, borderRadius: radii.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    },
    sheetDangerButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#FFFFFF' },
  });
}
