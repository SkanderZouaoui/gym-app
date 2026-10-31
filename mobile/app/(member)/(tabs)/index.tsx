import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing, typography } from '../../../src/theme/tokens';
import { useDismissedNotices } from '../../../src/store/preferences';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { useRemoteConfig } from '../../../src/config/RemoteConfigContext';
import { useMe, useMyBookings, useMyMemberships } from '../../../src/hooks/useMe';
import { useMyAnnouncements } from '../../../src/hooks/useAnnouncements';
import { useDisplayConfig, useHomeAlerts } from '../../../src/hooks/useHomeAlerts';
import { useNotifications } from '../../../src/hooks/useProfile';
import { useNetworkStatusContext } from '../../../src/hooks/NetworkStatusContext';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useCancelBooking } from '../../../src/hooks/useClasses';
import { useSessionStore } from '../../../src/store/session';
import { AppHeader } from '../../../src/components/adherent/AppHeader';
import { NextCourseCard } from '../../../src/components/adherent/NextCourseCard';
import { MembershipHeroCard } from '../../../src/components/adherent/MembershipHeroCard';
import { Notice, NoticeList, NoticePopups } from '../../../src/components/adherent/Notices';
import { Banner, BottomSheet, OfflineBanner, SkeletonBlock, Toast } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import i18n, { dateLocale } from '../../../src/i18n';
import { useNow } from '../../../src/hooks/useNow';

export default function HomeScreen() {
  const nowMs = useNow();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRtl, language } = useLanguage();
  const { config } = useRemoteConfig();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  const params = useLocalSearchParams<{ booked?: string }>();
  const { data: user, isLoading: userLoading } = useMe();
  const { data: memberships, isLoading: membershipsLoading } = useMyMemberships();
  const { data: bookings } = useMyBookings();
  const { data: announcements } = useMyAnnouncements();
  const { data: homeAlerts } = useHomeAlerts();
  const { data: display } = useDisplayConfig();
  const { isDismissed, dismiss: dismissNotice } = useDismissedNotices();
  const alertFormat = display?.alertFormat ?? 'Bandeau';
  const announcementFormat = display?.announcementFormat ?? 'Bandeau';
  const toLevel = (l: string): Notice['level'] => (l === 'urgent' || l === 'warn' ? l : 'info');
  const allAlerts: Notice[] = (homeAlerts ?? []).map((a) => ({ id: `alert:${a.id}`, title: a.title, message: a.message, level: toLevel(a.level) }));
  const allAnnouncements: Notice[] = (announcements ?? []).slice(0, 3).map((a) => ({
    id: `news:${a.id}`,
    title: a.title,
    message: a.body,
    level: (a.tone === 'danger' ? 'urgent' : a.tone === 'accent' ? 'warn' : 'info') as Notice['level'],
    icon: 'campaign' as const,
  }));
  // Dans la page, un message fermé disparaît ; le pop-up, lui, ne touche pas à la liste de la page.
  const alertNotices = allAlerts.filter((n) => !isDismissed(n.id));
  const announcementNotices = allAnnouncements.filter((n) => !isDismissed(n.id));
  const { data: notifications } = useNotifications();
  const { isOnline, lastSyncAt } = useNetworkStatusContext();
  const isDegraded = useSessionStore((s) => s.isDegraded);
  const cancelBooking = useCancelBooking();
  const queryClient = useQueryClient();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(() => queryClient.invalidateQueries());
  const [toastVisible, setToastVisible] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

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
  const now = nowMs;
  const nextBooking = bookings
    ?.filter((b) => b.status === 'CONFIRMED' && b.session && new Date(b.session.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.session!.startsAt).getTime() - new Date(b.session!.startsAt).getTime())[0];

  const isNewMember = memberships !== undefined && bookings !== undefined && memberships.length > 0 && bookings.length === 0;

  const expiringSoon =
    activeMembership?.endDate &&
    new Date(activeMembership.endDate).getTime() - nowMs < 14 * 24 * 60 * 60 * 1000;

  const daysLeft = activeMembership
    ? Math.max(0, Math.ceil((new Date(activeMembership.endDate).getTime() - now) / 86_400_000))
    : 0;
  const remainingRatio = activeMembership
    ? Math.min(1, daysLeft / Math.max(1, activeMembership.plan.durationDays))
    : 0;

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
      <ScrollView {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <AppHeader
          greeting={greetingParts(config, language).label}
          firstName={user?.firstName}
          lastName={user?.lastName}
          photoUrl={user?.photoUrl}
          hasUnreadNotification={unreadCount > 0}
          onPressNotifications={() => router.push('/(member)/notifications')}
        />

        <NoticeList items={alertNotices} format={alertFormat === 'Pop-up' ? 'Bandeau' : alertFormat} onDismiss={dismissNotice} />
        {announcementFormat === 'Bandeau' ? <NoticeList items={announcementNotices} format="Bandeau" onDismiss={dismissNotice} /> : null}

        {isDegraded ? (
          <Banner
            tone="warning"
            icon="sync-problem"
            title={t('member.session_hors_ligne')}
            text={t('member.vos_informations_nont_pas_pu')}
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
            title={t('home.membershipExpiringTitle', { date: new Date(activeMembership.endDate).toLocaleDateString(dateLocale()) })}
            text={t('home.membershipExpiringText')}
          />
        ) : null}

        <MembershipHeroCard
          planName={activeMembership?.plan.name ?? t('home.membershipNone')}
          periodLabel={activeMembership ? periodLabel(activeMembership.startDate, activeMembership.endDate) : undefined}
          daysLeft={activeMembership ? daysLeft : undefined}
          remainingRatio={remainingRatio}
          expired={!!expiredMembership || !activeMembership}
          onPressQr={() => router.push('/(member)/(tabs)/qr')}
        />

        {expiredMembership ? null : nextBooking?.session ? (
          <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>{t('home.nextCourseTitle')}</Text>
          <NextCourseCard
            startsAt={nextBooking.session.startsAt}
            className={nextBooking.session.classType.name}
            meta={`${nextBooking.session.room?.name ?? ''}${nextBooking.session.coach ? ` · ${nextBooking.session.coach.user.firstName}` : ''}`}
            countdownText={countdownLabel(nextBooking.session.startsAt)}
            booked
            onPress={() => router.push(`/(member)/session/${nextBooking.session!.id}`)}
          />
          </View>
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
            <OnboardRow icon="notifications" label={t('home.onboardNotifications')} onPress={() => router.push('/(member)/(tabs)/profile')} />
          </View>
        ) : null}

        {nextBooking?.session && !expiredMembership ? (
          <Pressable
            style={({ pressed }) => [styles.cancelLink, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => setConfirmCancel(true)}
            disabled={cancelBooking.isPending}
          >
            <MaterialIcons name="close" size={16} color={colors.dangerInk} />
            <Text style={styles.cancelLinkText}>{cancelBooking.isPending ? t('home.cancelling') : t('home.cancelBooking')}</Text>
          </Pressable>
        ) : null}

        {announcementFormat !== 'Bandeau' && (announcements ?? []).length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('home.announcementsTitle')}</Text>
            </View>
            {(announcements ?? []).slice(0, 3).map((a) => (
              <View key={a.id} style={styles.newsCard}>
                <LinearGradient colors={[colors.secondary, '#0B0B0F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                <View style={[styles.newsPill, NEWS_TONES[a.tone ?? 'info'].pill]}>
                  <Text style={[styles.newsPillText, { color: NEWS_TONES[a.tone ?? 'info'].ink }]}>{a.tone === 'danger' ? t('home.announcementImportant') : a.tone === 'accent' ? t('home.announcementNew') : t('home.announcementInfo')}</Text>
                </View>
                <View style={styles.newsText}>
                  <Text style={styles.newsTitle} numberOfLines={2}>{a.title}</Text>
                  <Text style={styles.newsBody} numberOfLines={2}>{a.body}</Text>
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
        <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} />
      ) : null}
      <NoticePopups
        items={[...(alertFormat === 'Pop-up' ? allAlerts : []), ...(announcementFormat === 'Pop-up' ? allAnnouncements : [])].filter((n) => !isDismissed(n.id))}
        onDismiss={dismissNotice}
      />
      <BottomSheet visible={confirmCancel} onClose={() => setConfirmCancel(false)}>
        <Text style={styles.sheetTitle}>{t('common.annuler_2', { name: nextBooking?.session?.classType.name })}</Text>
        <Text style={styles.sheetText}>{t('member.lannulation_est_gratuite_votre_place')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label={t('member.oui_annuler')}
            variant="secondary"
            loading={cancelBooking.isPending}
            onPress={() => nextBooking && cancelBooking.mutate(nextBooking.id, { onSettled: () => setConfirmCancel(false) })}
          />
          <Button label={t('member.garder_ma_place')} variant="outline" onPress={() => setConfirmCancel(false)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

/** Pastilles des annonces : teinte translucide discrète sur la carte sombre (info, nouveauté, important). */
const NEWS_TONES = {
  info: { ink: '#DDD6FE', pill: { backgroundColor: 'rgba(167,139,250,0.22)', borderColor: 'rgba(167,139,250,0.4)' } },
  accent: { ink: '#A7F3D0', pill: { backgroundColor: 'rgba(52,211,153,0.2)', borderColor: 'rgba(52,211,153,0.4)' } },
  danger: { ink: '#FECACA', pill: { backgroundColor: 'rgba(248,113,113,0.22)', borderColor: 'rgba(248,113,113,0.42)' } },
} as const;

/** Salutation pilotée par le back-office (clé "home.greeting", éditable
 * côté CMS) — distincte des textes fixes de l'app, traduits statiquement.
 * Le modèle "Bonjour, {prénom}" est scindé : la partie avant le prénom devient
 * la petite ligne de l'en-tête, le prénom est affiché en grand à côté. */
function greetingParts(config: ReturnType<typeof useRemoteConfig>['config'], language: string): { label: string } {
  const entry = config.strings.find((s) => s.k === 'home.greeting');
  const template = (language === 'ar' && entry?.ar.trim() ? entry.ar : entry?.fr) ?? i18n.t('member.bonjour_prenom');
  const label = template.split('{prénom}')[0].trim();
  return { label: label || i18n.t('member.hello_comma') };
}

function periodLabel(start: string, end: string): string {
  const fmt = (d: string, withYear: boolean) =>
    new Date(d).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
  return `${fmt(start, false)} → ${fmt(end, true)}`;
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
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
  safeArea: { flex: 1, backgroundColor: colors.bg },
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, padding: 14 },
  alertTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  alertMessage: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
  alertClose: { width: 44, height: 44, marginTop: -10, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  offlineBannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  skeletonHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  onboardList: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 8 },
  onboardListTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginBottom: 2 },
  onboardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  onboardRowLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text, flex: 1 },
  cancelLink: {
    alignSelf: 'center', height: 40, paddingHorizontal: 18, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger,
  },
  cancelLinkText: { fontFamily: fonts.bodySemiBold, fontSize: 13, letterSpacing: 0.1, color: colors.dangerInk },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { ...typography.title, fontSize: 17, color: colors.text, textAlign },
  newsCard: {
    height: 176, borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#0B0B0F',
  },
  newsPill: {
    position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  newsPillText: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, letterSpacing: 0.2, color: '#FFFFFF' },
  newsText: { padding: 18 },
  newsTitle: { fontFamily: fonts.head, fontSize: 20, letterSpacing: -0.4, color: '#FFFFFF' },
  newsBody: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
  });
}
