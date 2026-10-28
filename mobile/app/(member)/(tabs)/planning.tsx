import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { useCreateBooking, useSessions } from '../../../src/hooks/useClasses';
import { useMyBookings } from '../../../src/hooks/useMe';
import type { ClassSessionSummary } from '../../../src/api/types';
import { ApiError } from '../../../src/api/client';
import { Banner, EmptyState, OfflineBanner, ScreenTitle, SkeletonBlock, SkeletonGroup, Toast } from '../../../src/components/ui';
import { useNetworkStatusContext } from '../../../src/hooks/NetworkStatusContext';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { CourseCard } from '../../../src/components/adherent/CourseCard';
import { DaySelector } from '../../../src/components/adherent/DaySelector';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';

const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function buildWeek() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return { label: WEEKDAY_LABELS[date.getDay()], dayNumber: String(date.getDate()), date };
  });
}

export default function PlanningScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: myBookings } = useMyBookings();
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  const { data: sessions, isLoading, isError, refetch } = useSessions();
  const { isOnline, lastSyncAt } = useNetworkStatusContext();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);
  const createBooking = useCreateBooking();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const days = useMemo(buildWeek, []);

  const [classTypeFilter, setClassTypeFilter] = useState<string | null>(null);

  // Types de cours proposés en filtre : uniquement ceux programmés le jour sélectionné.
  const classTypeOptions = useMemo(() => {
    const target = days[selectedDay]?.date;
    const names = new Set(
      (sessions ?? [])
        .filter((s) => !target || new Date(s.startsAt).toDateString() === target.toDateString())
        .map((s) => s.classType.name),
    );
    return Array.from(names).sort();
  }, [sessions, days, selectedDay]);
  const activeType = classTypeFilter && classTypeOptions.includes(classTypeFilter) ? classTypeFilter : null;

  const upcomingCount = useMemo(
    () => (myBookings ?? []).filter((b) => b.status === 'CONFIRMED' && b.session && new Date(b.session.startsAt).getTime() >= Date.now()).length,
    [myBookings],
  );

  const handleBook = (sessionId: string) => {
    setBookingError(null);
    createBooking.mutate(sessionId, {
      onError: (e) => setBookingError(e instanceof ApiError ? e.message : t('planning.bookingError')),
    });
  };

  const daySessions = useMemo(() => {
    if (!sessions) return [];
    const target = days[selectedDay]?.date;
    return sessions.filter((s) => {
      const d = new Date(s.startsAt);
      const matchesDay = !target || d.toDateString() === target.toDateString();
      const matchesType = !activeType || s.classType.name === activeType;
      return matchesDay && matchesType;
    });
  }, [sessions, days, selectedDay, activeType]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {!isOnline ? (
        <View style={styles.bannerWrap}>
          <OfflineBanner lastSyncAt={lastSyncAt} />
        </View>
      ) : null}

      <View style={styles.header}>
        <ScreenTitle
          title={t('planning.title')}
          subtitle={t('planning.subtitle', { month: (days[selectedDay]?.date ?? new Date()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) })}
        />
        <Pressable
          style={({ pressed }) => [styles.bookingsButton, pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={() => router.push('/(member)/reservations')}
        >
          <MaterialIcons name="event-available" size={20} color={colors.primaryInk} />
          <Text style={styles.bookingsButtonText}>{t('planning.myBookings')} · {upcomingCount}</Text>
        </Pressable>
      </View>

      <View style={styles.sticky}>
        <DaySelector days={days} selectedIndex={selectedDay} onSelect={setSelectedDay} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[null, ...classTypeOptions].map((name) => {
            const active = activeType === name;
            return (
              <Pressable key={name ?? 'all'} onPress={() => setClassTypeFilter(name)} style={styles.filterPill}>
                {active ? (
                  <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                ) : null}
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{name ?? t('planning.all')}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {bookingError ? (
        <View style={styles.bannerWrap}>
          <Banner tone="danger" icon="error" text={bookingError} />
        </View>
      ) : null}

      {isLoading ? (
        <SkeletonGroup>
          <View style={styles.list}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} height={116} />
            ))}
          </View>
        </SkeletonGroup>
      ) : isError ? (
        <EmptyState
          icon="cloud-off"
          title={t('planning.unavailableTitle')}
          text={t('planning.unavailableText')}
          tone="danger"
          actionLabel={t('common.retry')}
          onAction={() => refetch()}
        />
      ) : (
        <FlatList {...tabBarScroll}
          data={daySessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onBook={() => handleBook(item.id)}
              onPress={() => router.push(`/(member)/session/${item.id}`)}
              booking={createBooking.isPending}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="event-busy"
              title={t('planning.emptyDayTitle')}
              text={t('planning.emptyDayText')}
              tone="primary"
            />
          }
        />
      )}

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text="Pas de connexion — impossible d’actualiser" iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

function SessionCard({
  session,
  onBook,
  onPress,
  booking,
}: {
  session: ClassSessionSummary;
  onBook: () => void;
  onPress: () => void;
  booking: boolean;
}) {
  const { t } = useTranslation();
  const spotsLeft = session.capacity - session._count.bookings;
  const isFull = spotsLeft <= 0;
  const progress = session._count.bookings / Math.max(session.capacity, 1);
  const durationMinutes = Math.round(
    (new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60000,
  );

  return (
    <CourseCard
      time={new Date(session.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      duration={`${durationMinutes} min`}
      name={session.classType.name}
      meta={[session.coach?.user.firstName, session.room?.name, `${session.capacity} places`].filter(Boolean).join(' · ')}
      spotsLabel={isFull ? t('planning.full') : t('planning.spotsLeft', { count: spotsLeft })}
      statusTone={isFull ? 'danger' : spotsLeft <= 3 ? 'warning' : 'success'}
      progress={progress}
      ctaLabel={booking ? t('planning.booking') : isFull ? t('planning.waitlist') : t('planning.book')}
      onPress={onPress}
      onPressCta={onBook}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    bookingsButton: {
      height: 46, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder, marginTop: spacing.sm,
    },
    bookingsButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    filterPill: {
      height: 36, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    filterText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    filterTextActive: { color: colors.primaryContrast },
    sticky: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
    filterRow: { gap: 8 },
    bannerWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    list: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: 120 },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 19, color: colors.text, marginBottom: spacing.sm },
    optionsWrap: { gap: 8, marginBottom: spacing.sm },
    optionRow: {
      height: 48, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface, justifyContent: 'center', paddingHorizontal: spacing.md,
    },
    optionRowActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    optionTextActive: { color: colors.primaryContrast },
    emptyOptionsText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  });
}
