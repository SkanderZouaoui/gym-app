import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe, useMyBookings, useMyMemberships } from '../../../src/hooks/useMe';
import { useBranches } from '../../../src/hooks/useBranches';
import { useBranchOccupancy } from '../../../src/hooks/useOccupancy';
import { useMyActiveChallenges } from '../../../src/hooks/useLoyalty';
import { useMyAnnouncements } from '../../../src/hooks/useAnnouncements';
import { useNotifications } from '../../../src/hooks/useProfile';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { useCancelBooking } from '../../../src/hooks/useClasses';
import { AppHeader } from '../../../src/components/adherent/AppHeader';
import { NextCourseCard } from '../../../src/components/adherent/NextCourseCard';
import { Banner, BarHistogram, OfflineBanner, Pill, ProgressBar, SkeletonBlock, Toast } from '../../../src/components/ui';

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ booked?: string }>();
  const { data: user, isLoading: userLoading } = useMe();
  const { data: memberships, isLoading: membershipsLoading } = useMyMemberships();
  const { data: bookings } = useMyBookings();
  const { data: branches } = useBranches();
  const { data: occupancy } = useBranchOccupancy(user?.homeBranchId ?? undefined);
  const { data: challenges } = useMyActiveChallenges();
  const { data: announcements } = useMyAnnouncements();
  const { data: notifications } = useNotifications();
  const { isOnline, lastSyncAt } = useNetworkStatus();
  const cancelBooking = useCancelBooking();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const activeChallenge = challenges?.find((c) => !c.completedAt);
  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;
  const homeBranch = branches?.find((b) => b.id === user?.homeBranchId);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const countdownLabel = (startsAt: string) => {
    const diffMs = new Date(startsAt).getTime() - now;
    if (diffMs <= 0) return 'En cours';
    const hours = Math.floor(diffMs / 3_600_000);
    const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
    if (hours === 0) return `dans ${minutes} min`;
    return `dans ${hours}h${String(minutes).padStart(2, '0')}`;
  };

  const occupancyLabel = (percent: number | null) => {
    if (percent === null) return { label: '—', tone: colors.muted };
    if (percent >= 75) return { label: 'Dense', tone: colors.dangerInk };
    if (percent >= 40) return { label: 'Modérée', tone: colors.warningInk };
    return { label: 'Calme', tone: colors.successInk };
  };

  // Regroupe les 24 tranches horaires en 4 blocs (8h/12h/16h/20h) comme la maquette.
  const hourlyBuckets = useMemo(() => {
    if (!occupancy?.hourly) return null;
    const buckets = [0, 0, 0, 0];
    occupancy.hourly.forEach((v, h) => {
      if (h < 8) return;
      const idx = Math.min(3, Math.floor((h - 8) / 4));
      buckets[idx] += v;
    });
    return buckets;
  }, [occupancy?.hourly]);

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
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <AppHeader
          siteName={homeBranch?.name}
          hasUnreadNotification={unreadCount > 0}
          onPressNotifications={() => router.push('/(member)/notifications')}
        />

        <View>
          <Text style={styles.hello}>Bonjour, {user?.firstName ?? ''}</Text>
          <Text style={styles.sub}>
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} · {activeMembership?.plan.name ?? 'Sans abonnement'}
          </Text>
        </View>

        {!isOnline ? <OfflineBanner lastSyncAt={lastSyncAt} /> : null}

        {expiredMembership ? (
          <Banner
            tone="danger"
            icon="event-busy"
            title="Abonnement expiré"
            text="Vos réservations sont suspendues et votre QR est refusé au pointage. Renouvelez à l'accueil (espèces, virement ou chèque)."
          />
        ) : expiringSoon && activeMembership ? (
          <Banner
            tone="warning"
            icon="event"
            title={`Abonnement : expire le ${new Date(activeMembership.endDate).toLocaleDateString('fr-FR')}`}
            text="Renouvelez à l'accueil de votre salle."
          />
        ) : null}

        <Pressable
          style={[styles.qrCard, expiredMembership && styles.qrButtonDisabled]}
          onPress={() => router.push('/(member)/(tabs)/qr')}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.qrCardTitle}>Mon QR de présence</Text>
            <Text style={styles.qrCardSub}>À faire scanner à l’entrée du cours</Text>
            <View style={styles.qrCardButton}>
              <MaterialIcons name="qr-code-2" size={20} color={colors.primaryContrast} />
              <Text style={styles.qrCardButtonText}>Afficher mon QR</Text>
            </View>
          </View>
          <View style={styles.qrCardIcon}>
            <MaterialIcons name="qr-code-2" size={48} color={colors.primaryContrast} />
          </View>
        </Pressable>

        <Pressable style={styles.affluenceCard} onPress={() => router.push('/(member)/occupancy')}>
          <View style={styles.affluenceHeaderRow}>
            <View style={styles.affluenceHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.affluenceLabel}>Affluence en direct</Text>
            </View>
          </View>
          <View style={styles.affluenceValueRow}>
            <Text style={[styles.affluenceValue, { color: occupancyLabel(occupancy?.percent ?? null).tone }]}>
              {occupancy?.percent ?? '—'}{occupancy?.percent !== null && occupancy?.percent !== undefined ? ' %' : ''}
            </Text>
            <Text style={[styles.affluenceStateLabel, { color: occupancyLabel(occupancy?.percent ?? null).tone }]}>
              {occupancyLabel(occupancy?.percent ?? null).label}
              {occupancy?.percent !== null && occupancy?.percent !== undefined && occupancy.percent < 40 ? ' · idéal maintenant' : ''}
            </Text>
          </View>
          {hourlyBuckets ? (
            <>
              <BarHistogram values={hourlyBuckets} height={48} />
              <View style={styles.histogramLabels}>
                <Text style={styles.histogramLabel}>8h</Text>
                <Text style={styles.histogramLabel}>12h</Text>
                <Text style={styles.histogramLabel}>16h</Text>
                <Text style={styles.histogramLabel}>20h</Text>
              </View>
            </>
          ) : null}
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
            <Text style={styles.onboardTitle}>Aucune réservation pour l’instant</Text>
            <Text style={styles.onboardText}>Réservez votre premier cours en deux gestes.</Text>
            <Pressable style={styles.onboardButton} onPress={() => router.push('/(member)/(tabs)/planning')}>
              <Text style={styles.onboardButtonText}>Explorer le planning</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyCourseCard}>
            <Text style={styles.cardLabel}>AUCUN COURS À VENIR</Text>
            <Pressable onPress={() => router.push('/(member)/(tabs)/planning')} style={{ marginTop: 8 }}>
              <Text style={styles.linkText}>Voir le planning →</Text>
            </Pressable>
          </View>
        )}

        {isNewMember ? (
          <View style={styles.onboardList}>
            <Text style={styles.onboardListTitle}>Pour bien démarrer</Text>
            <OnboardRow icon="check-circle" label="Compléter mon profil" done onPress={() => router.push('/(member)/profile-edit')} />
            <OnboardRow icon="event-available" label="Réserver un premier cours" onPress={() => router.push('/(member)/(tabs)/planning')} />
            <OnboardRow icon="notifications" label="Activer les notifications" onPress={() => router.push('/(member)/settings')} />
          </View>
        ) : null}

        {nextBooking?.session && !expiredMembership ? (
          <Pressable
            style={styles.cancelLink}
            onPress={() => cancelBooking.mutate(nextBooking.id)}
            disabled={cancelBooking.isPending}
          >
            <Text style={styles.cancelLinkText}>{cancelBooking.isPending ? 'Annulation…' : 'Annuler ce cours'}</Text>
          </Pressable>
        ) : null}

        {activeChallenge ? (
          <Pressable style={styles.challengeCard} onPress={() => router.push('/(member)/loyalty')}>
            <View style={styles.challengeHeaderRow}>
              <View style={styles.challengeIcon}>
                <MaterialIcons name="emoji-events" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeLabel}>DÉFI EN COURS</Text>
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
              +{activeChallenge.pointsReward} points à la clé · {Math.max(0, Math.ceil((new Date(activeChallenge.endDate).getTime() - now) / 86_400_000))} jours restants
            </Text>
          </Pressable>
        ) : null}

        {announcements && announcements.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Annonces</Text>
            </View>
            {announcements.slice(0, 3).map((a, i) => (
              <View key={a.id} style={styles.announcementRow}>
                <View style={styles.announcementThumb} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Pill label={i === 0 ? 'Nouveau' : 'Info'} tone={i === 0 ? 'primary' : 'info'} />
                  <Text style={styles.announcementTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.announcementMeta} numberOfLines={1}>{a.body}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {toastVisible ? (
        <Toast icon="check-circle" text={`Réservation confirmée${params.booked ? ` · ${params.booked}` : ''}`} iconColor={colors.success} />
      ) : null}
    </SafeAreaView>
  );
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
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.onboardRow} onPress={onPress}>
      <MaterialIcons name={done ? 'check-circle' : icon} size={22} color={done ? colors.successInk : colors.muted} />
      <Text style={styles.onboardRowLabel}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  skeletonHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { fontFamily: fonts.head, fontSize: 28, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, marginTop: 2 },
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
  affluenceCard: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  affluenceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  affluenceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  affluenceLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.text },
  affluenceValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  affluenceValue: { fontFamily: fonts.headBold, fontSize: 30 },
  affluenceStateLabel: { fontFamily: fonts.bodyBold, fontSize: 13 },
  affluenceSub: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
  histogramLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  histogramLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
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
