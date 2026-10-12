import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { useRemoteConfig } from '../../../src/config/RemoteConfigContext';
import { useMe, useMyBookings, useMyMemberships } from '../../../src/hooks/useMe';
import { useMyActiveChallenges } from '../../../src/hooks/useLoyalty';
import { useMyAnnouncements } from '../../../src/hooks/useAnnouncements';
import { useNotifications } from '../../../src/hooks/useProfile';
import { useNetworkStatusContext } from '../../../src/hooks/NetworkStatusContext';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useCancelBooking } from '../../../src/hooks/useClasses';
import { useSessionStore } from '../../../src/store/session';
import { AppHeader } from '../../../src/components/adherent/AppHeader';
import { NextCourseCard } from '../../../src/components/adherent/NextCourseCard';
import { Banner, OfflineBanner, Pill, ProgressBar, SkeletonBlock, Toast } from '../../../src/components/ui';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRtl, language } = useLanguage();
  const { config } = useRemoteConfig();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  const params = useLocalSearchParams<{ booked?: string }>();
  const { data: user, isLoading: userLoading } = useMe();
  const { data: memberships, isLoading: membershipsLoading } = useMyMemberships();
  const { data: bookings } = useMyBookings();
  const { data: challenges } = useMyActiveChallenges();
  const { data: announcements } = useMyAnnouncements();
  const { data: notifications } = useNotifications();
  const { isOnline, lastSyncAt } = useNetworkStatusContext();
  const isDegraded = useSessionStore((s) => s.isDegraded);
  const cancelBooking = useCancelBooking();
  const queryClient = useQueryClient();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(() => queryClient.invalidateQueries());
  const [toastVisible, setToastVisible] = useState(false);

  const activeChallenge = challenges?.find((c) => !c.completedAt);
  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  useEffect(() => {
    if (!params.booked) return;
    const show = setTimeout(() => setToastVisible(true), 0);
    const hide = setTimeout(() => setToastVisible(false), 3000);
    router.setParams({ booked: undefined });
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [params.booked]);

  const activeMembership = memberships?.find((m) => m.status === 'ACTIVE');
  const expiredMembership = !activeMembership && memberships?.some((m) => m.status === 'EXPIRED');
  const now = Date.now();
  const nextBooking = bookings
    ?.filter((b) => b.status === 'CONFIRMED' && b.session && new Date(b.session.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.session!.startsAt).getTime() - new Date(b.session!.startsAt).getTime())[0];

  const isNewMember = memberships !== undefined && bookings !== undefined && memberships.length > 0 && bookings.length === 0;

  const expiringSoon =
    activeMembership?.endDate &&
    new Date(activeMembership.endDate).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000;

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const countdownLabel = (startsAt: string) => {
    const diffMs = new Date(startsAt).getTime() - now;
    if (diffMs <= 0) return t('home.inProgress');
    const hours = Math.floor(diffMs / 3_600_000);
    const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
    if (hours === 0) return t('home.inMinutes', { minutes });
    return t('home.inHours', { hours, minutes: String(minutes).padStart(2, '0') });
  };

  const isLoading = userLoading || membershipsLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.skeletonHeaderRow}>
            <SkeletonBlock height={28} width={110} radius={radii.xs} />
            <SkeletonBlock height={44} width={44} radius={999} />
          </View>
          <SkeletonBlock height={28} width="60%" radius={radii.xs} />
          <SkeletonBlock height={124} radius={radii.lg} />
          <SkeletonBlock height={150} radius={radii.md} />
          <SkeletonBlock height={64} radius={radii.md} />
          <SkeletonBlock height={140} radius={radii.md} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {!isOnline ? (
        <View style={styles.offlineBannerWrap}>
          <OfflineBanner lastSyncAt={lastSyncAt} />
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <AppHeader
          hasUnreadNotification={unreadCount > 0}
          onPressNotifications={() => router.push('/(member)/notifications')}
        />

        <View>
          <Text style={styles.hello}>{greetingText(config, language, user?.firstName)}</Text>
          <Text style={styles.sub}>
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} · {activeMembership?.plan.name ?? t('home.membershipNone')}
          </Text>
        </View>

        {isDegraded ? (
          <Banner
            tone="warning"
            icon="sync-problem"
            title="Session hors ligne"
            text="Vos informations n'ont pas pu être vérifiées en ligne récemment. Certaines données peuvent être obsolètes."
          />
        ) : null}

        {expiredMembership ? (
          <Banner
            tone="danger"
            icon="event-busy"
            title={t('home.membershipExpired')}
            text={t('home.membershipExpiredText')}
          />
        ) : expiringSoon && activeMembership ? (
          <Banner
            tone="warning"
            icon="event"
            title={t('home.membershipExpiringTitle', { date: new Date(activeMembership.endDate).toLocaleDateString('fr-FR') })}
            text={t('home.membershipExpiringText')}
          />
        ) : null}

        <Pressable
          style={[styles.qrCard, expiredMembership && styles.qrButtonDisabled]}
          onPress={() => router.push('/(member)/(tabs)/qr')}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.qrCardTitle}>{t('home.qrCardTitle')}</Text>
            <Text style={styles.qrCardSub}>{t('home.qrCardSub')}</Text>
            <View style={styles.qrCardButton}>
              <MaterialIcons name="qr-code-2" size={20} color={colors.primaryContrast} />
              <Text style={styles.qrCardButtonText}>{t('home.qrCardButton')}</Text>
            </View>
          </View>
          <View style={styles.qrCardIcon}>
            <MaterialIcons name="qr-code-2" size={48} color={colors.primaryContrast} />
          </View>
        </Pressable>

        {expiredMembership ? null : nextBooking?.session ? (
          <NextCourseCard
            className={nextBooking.session.classType.name}
            meta={`${nextBooking.session.room?.name ?? ''}${nextBooking.session.coach ? ` · ${nextBooking.session.coach.user.firstName}` : ''}`}
            countdownText={countdownLabel(nextBooking.session.startsAt)}
            booked
            onPress={() => router.push(`/(member)/session/${nextBooking.session!.id}`)}
          />
        ) : isNewMember ? (
          <View style={styles.onboardCard}>
            <View style={styles.onboardIcon}>
              <MaterialIcons name="event-available" size={34} color={colors.primaryInk} />
            </View>
            <Text style={styles.onboardTitle}>{t('home.noBookingTitle')}</Text>
            <Text style={styles.onboardText}>{t('home.noBookingText')}</Text>
            <Pressable style={styles.onboardButton} onPress={() => router.push('/(member)/(tabs)/planning')}>
              <Text style={styles.onboardButtonText}>{t('home.explorePlanning')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyCourseCard}>
            <Text style={styles.cardLabel}>{t('home.noUpcomingCourse')}</Text>
            <Pressable onPress={() => router.push('/(member)/(tabs)/planning')} style={{ marginTop: 8 }}>
              <Text style={styles.linkText}>{t('home.viewPlanning')}</Text>
            </Pressable>
          </View>
        )}

        {isNewMember ? (
          <View style={styles.onboardList}>
            <Text style={styles.onboardListTitle}>{t('home.onboardTitle')}</Text>
            <OnboardRow icon="check-circle" label={t('home.onboardCompleteProfile')} done onPress={() => router.push('/(member)/profile-edit')} />
            <OnboardRow icon="event-available" label={t('home.onboardFirstBooking')} onPress={() => router.push('/(member)/(tabs)/planning')} />
            <OnboardRow icon="notifications" label={t('home.onboardNotifications')} onPress={() => router.push('/(member)/settings')} />
          </View>
        ) : null}

        {nextBooking?.session && !expiredMembership ? (
          <Pressable
            style={styles.cancelLink}
            onPress={() => cancelBooking.mutate(nextBooking.id)}
            disabled={cancelBooking.isPending}
          >
            <Text style={styles.cancelLinkText}>{cancelBooking.isPending ? t('home.cancelling') : t('home.cancelBooking')}</Text>
          </Pressable>
        ) : null}

        {activeChallenge ? (
          <Pressable style={styles.challengeCard} onPress={() => router.push('/(member)/loyalty')}>
            <View style={styles.challengeHeaderRow}>
              <View style={styles.challengeIcon}>
                <MaterialIcons name="emoji-events" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeLabel}>{t('home.challengeInProgress')}</Text>
                <Text style={styles.challengeTitle} numberOfLines={1}>{activeChallenge.name}</Text>
              </View>
              <Text style={styles.challengeCount}>
                {activeChallenge.myProgress}/{activeChallenge.targetValue}
              </Text>
            </View>
            <ProgressBar
              progress={activeChallenge.targetValue > 0 ? activeChallenge.myProgress / activeChallenge.targetValue : 0}
              color={colors.accent}
              trackColor={colors.surface}
            />
            <Text style={styles.challengeMeta}>
              {t('home.challengeMeta', {
                points: activeChallenge.pointsReward,
                days: Math.max(0, Math.ceil((new Date(activeChallenge.endDate).getTime() - now) / 86_400_000)),
              })}
            </Text>
          </Pressable>
        ) : null}

        {announcements && announcements.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('home.announcementsTitle')}</Text>
            </View>
            {announcements.slice(0, 3).map((a, i) => (
              <View key={a.id} style={styles.announcementRow}>
                <View style={styles.announcementThumb} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Pill label={i === 0 ? t('home.announcementNew') : t('home.announcementInfo')} tone={i === 0 ? 'primary' : 'info'} />
                  <Text style={styles.announcementTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.announcementMeta} numberOfLines={1}>{a.body}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {toastVisible ? (
        <Toast
          icon="check-circle"
          text={t('home.bookingConfirmed', { detail: params.booked ? ` · ${params.booked}` : '' })}
          iconColor={colors.success}
        />
      ) : null}

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text="Pas de connexion — impossible d’actualiser" iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

/** Salutation pilotée par le back-office (clé "home.greeting", éditable
 * côté CMS) — distincte des textes fixes de l'app, traduits statiquement. */
function greetingText(config: ReturnType<typeof useRemoteConfig>['config'], language: string, firstName?: string): string {
  const entry = config.strings.find((s) => s.k === 'home.greeting');
  const template = (language === 'ar' && entry?.ar.trim() ? entry.ar : entry?.fr) ?? 'Bonjour, {prénom}';
  return template.replace('{prénom}', firstName ?? '');
}

function OnboardRow({
  icon,
  label,
  done,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  done?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  return (
    <Pressable style={styles.onboardRow} onPress={onPress}>
      <MaterialIcons name={done ? 'check-circle' : icon} size={22} color={done ? colors.successInk : colors.muted} />
      <Text style={styles.onboardRowLabel}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  const textAlign = isRtl ? 'right' as const : 'left' as const;
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  offlineBannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  skeletonHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { fontFamily: fonts.head, fontSize: 28, color: colors.text, textAlign },
  sub: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, marginTop: 2, textAlign },
  qrCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.secondary,
    borderRadius: radii.lg, padding: 18,
  },
  qrButtonDisabled: { opacity: 0.5 },
  qrCardTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.onSecondary, letterSpacing: -0.2 },
  qrCardSub: { fontFamily: fonts.body, fontSize: 13, color: colors.onSecondary, opacity: 0.85 },
  qrCardButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 6,
    height: 40, paddingHorizontal: 14, borderRadius: radii.sm, backgroundColor: colors.primary,
  },
  qrCardButtonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryContrast },
  qrCardIcon: {
    width: 72, height: 72, borderRadius: radii.md, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emptyCourseCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  cardLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.5, color: colors.muted },
  linkText: { fontFamily: fonts.bodyBold, color: colors.primaryInk, fontSize: 13 },
  onboardCard: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.borderStrong,
    borderStyle: 'dashed', padding: 20, alignItems: 'center', gap: 10,
  },
  onboardIcon: { width: 64, height: 64, borderRadius: 999, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  onboardTitle: { fontFamily: fonts.headBold, fontSize: 17, color: colors.text, textAlign: 'center' },
  onboardText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, textAlign: 'center' },
  onboardButton: { height: 44, paddingHorizontal: 18, borderRadius: radii.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  onboardButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
  onboardList: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 8 },
  onboardListTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginBottom: 2 },
  onboardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  onboardRowLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text, flex: 1 },
  cancelLink: { alignSelf: 'center' },
  cancelLinkText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dangerInk },
  challengeCard: {
    backgroundColor: colors.accentSoft, borderRadius: radii.lg, padding: spacing.md, gap: 10,
    shadowColor: colors.accent, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  challengeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  challengeIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  challengeLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, letterSpacing: 0.5, color: colors.accentInk },
  challengeTitle: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text, marginTop: 1 },
  challengeCount: { fontFamily: fonts.headBold, fontSize: 17, color: colors.accentInk },
  challengeMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.accentInk },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
  announcementRow: {
    flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
  },
  announcementThumb: { width: 56, height: 56, borderRadius: radii.sm, backgroundColor: colors.surface2 },
  announcementTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.text, marginTop: 3 },
  announcementMeta: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
  });
}
