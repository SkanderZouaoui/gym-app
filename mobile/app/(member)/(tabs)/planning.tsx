import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { GymRefreshControl, useRefreshOverlayTop } from '../../../src/components/ui/GymRefreshControl';
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
import { Banner, EmptyState, ScreenTitle, SkeletonBlock, SkeletonGroup, Toast } from '../../../src/components/ui';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { CourseCard } from '../../../src/components/adherent/CourseCard';
import { BookingConfirmSheet } from '../../../src/components/adherent/BookingConfirmSheet';
import { DaySelector } from '../../../src/components/adherent/DaySelector';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { dateLocale } from '../../../src/i18n';
import { WEEKDAYS_SHORT_SUN } from '../../../src/i18n/labels';
import { HScroll } from '../../../src/components/ui/HScroll';
import { useNow } from '../../../src/hooks/useNow';

const WEEKDAY_LABELS = WEEKDAYS_SHORT_SUN;

type Period = 'morning' | 'afternoon' | 'evening';
type Row = { kind: 'header'; period: Period; count: number } | { kind: 'session'; session: ClassSessionSummary };
const PERIOD_ICON: Record<Period, keyof typeof MaterialIcons.glyphMap> = { morning: 'wb-twilight', afternoon: 'wb-sunny', evening: 'nights-stay' };
const periodOf = (d: Date): Period => (d.getHours() < 12 ? 'morning' : d.getHours() < 18 ? 'afternoon' : 'evening');

function buildWeek() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return { label: WEEKDAY_LABELS[date.getDay()], dayNumber: String(date.getDate()), date };
  });
}

export default function PlanningScreen() {
  const nowMs = useNow();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: myBookings } = useMyBookings();
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  const { data: sessions, isLoading, isError, refetch } = useSessions();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);
  const createBooking = useCreateBooking();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [toBook, setToBook] = useState<ClassSessionSummary | null>(null);
  const days = useMemo(() => buildWeek(), []);

  const daysWithCount = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const s of sessions ?? []) {
      const k = new Date(s.startsAt).toDateString();
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }
    return days.map((d) => ({ ...d, count: perDay.get(d.date.toDateString()) ?? 0 }));
  }, [sessions, days]);

  const listTop = useRefreshOverlayTop();
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
    () => (myBookings ?? []).filter((b) => b.status === 'CONFIRMED' && b.session && new Date(b.session.startsAt).getTime() >= nowMs).length,
    [myBookings, nowMs],
  );

  const bookedStatus = useMemo(() => {
    const m = new Map<string, 'CONFIRMED' | 'WAITLISTED'>();
    for (const b of myBookings ?? []) if (b.status === 'CONFIRMED' || b.status === 'WAITLISTED') m.set(b.sessionId, b.status);
    return m;
  }, [myBookings]);

  const handleBook = (sessionId: string) => {
    setBookingError(null);
    createBooking.mutate(sessionId, {
      onSuccess: () => setToBook(null),
      onError: (e) => {
        setToBook(null);
        setBookingError(e instanceof ApiError ? e.message : t('planning.bookingError'));
      },
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

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let last: Period | null = null;
    for (const session of daySessions) {
      const period = periodOf(new Date(session.startsAt));
      if (period !== last) {
        out.push({ kind: 'header', period, count: daySessions.filter((x) => periodOf(new Date(x.startsAt)) === period).length });
        last = period;
      }
      out.push({ kind: 'session', session });
    }
    return out;
  }, [daySessions]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      <View style={styles.header}>
        <ScreenTitle
          title={t('planning.title')}
          subtitle={t('planning.subtitle', { month: (days[selectedDay]?.date ?? new Date()).toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' }) })}
        />
        <Pressable
          style={({ pressed }) => [styles.bookingsButton, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}
          onPress={() => router.push('/(member)/reservations')}
          accessibilityRole="button"
        >
          <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.bookingsIcon}>
            <MaterialIcons name="event-available" size={20} color={colors.primaryContrast} />
          </View>
          <View style={styles.bookingsTexts}>
            <Text style={styles.bookingsButtonText}>{t('planning.myBookings')}</Text>
            <Text style={styles.bookingsSub}>{upcomingCount > 0 ? t('planning.upcomingCount', { count: upcomingCount }) : t('planning.noUpcoming')}</Text>
          </View>
          <View style={styles.bookingsBadge}>
            <Text style={styles.bookingsBadgeText}>{upcomingCount}</Text>
          </View>
          <MaterialIcons name={isRtl ? 'chevron-left' : 'chevron-right'} size={22} color={colors.primaryContrast} />
        </Pressable>
      </View>

      <View style={styles.sticky}>
        <DaySelector days={daysWithCount} selectedIndex={selectedDay} onSelect={setSelectedDay} />
        <HScroll contentContainerStyle={styles.filterRow}>
          {[null, ...classTypeOptions].map((name) => {
            const active = activeType === name;
            return (
              <Pressable key={name ?? 'all'} onPress={() => setClassTypeFilter(name)} style={styles.filterPill}>
                {active ? (
                  <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                ) : null}
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{name ?? t('planning.all')}</Text>
              </Pressable>
            );
          })}
        </HScroll>
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
        <View ref={listTop.ref} onLayout={listTop.onLayout} style={styles.listBox}>
        <FlatList {...tabBarScroll}
          data={rows}
          keyExtractor={(item) => (item.kind === 'header' ? `h-${item.period}` : item.session.id)}
          contentContainerStyle={styles.list}
          refreshControl={<GymRefreshControl refreshing={refreshing} onRefresh={onRefresh} overlayTop={listTop.top} />}
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <View style={styles.periodRow}>
                <MaterialIcons name={PERIOD_ICON[item.period]} size={18} color={colors.primaryInk} />
                <Text style={styles.periodText}>{t(`planning.${item.period}`)}</Text>
                <View style={styles.periodLine} />
                <Text style={styles.periodCount}>{item.count}</Text>
              </View>
            ) : (
              <SessionCard
                session={item.session}
                bookedAs={bookedStatus.get(item.session.id)}
                onBook={() => setToBook(item.session)}
                onPress={() => router.push(`/(member)/session/${item.session.id}`)}
              />
            )
          }
          ListEmptyComponent={
            <EmptyState
              icon="event-busy"
              title={t('planning.emptyDayTitle')}
              text={t('planning.emptyDayText')}
              tone="primary"
            />
          }
        />
        </View>
      )}

      <BookingConfirmSheet
        session={toBook}
        pending={createBooking.isPending}
        onConfirm={() => toBook && handleBook(toBook.id)}
        onClose={() => setToBook(null)}
      />

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

function SessionCard({
  session,
  bookedAs,
  onBook,
  onPress,
}: {
  session: ClassSessionSummary;
  bookedAs?: 'CONFIRMED' | 'WAITLISTED';
  onBook: () => void;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const nowMs = useNow();
  const spotsLeft = session.capacity - session._count.bookings;
  const isFull = spotsLeft <= 0;
  const started = new Date(session.startsAt).getTime() <= nowMs;
  const progress = session._count.bookings / Math.max(session.capacity, 1);
  const durationMinutes = Math.round(
    (new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60000,
  );

  return (
    <CourseCard
      time={new Date(session.startsAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })}
      duration={`${durationMinutes} min`}
      name={session.classType.name}
      coach={session.coach ? `${session.coach.user.firstName} ${session.coach.user.lastName.charAt(0)}.` : undefined}
      room={session.room?.name}
      capacity={session.capacity}
      booked_count={session._count.bookings}
      spotsLabel={isFull ? t('planning.full') : t('planning.spotsLeft', { count: spotsLeft })}
      statusTone={isFull ? 'danger' : spotsLeft <= 3 ? 'warning' : 'success'}
      progress={progress}
      booked={!!bookedAs}
      closed={started && !bookedAs}
      ctaLabel={started && !bookedAs ? t('member.reservation_fermee') : bookedAs === 'WAITLISTED' ? t('member.en_liste_dattente') : bookedAs ? t('member.reserve') : isFull ? t('planning.waitlist') : t('planning.book')}
      onPress={onPress}
      onPressCta={bookedAs || started ? onPress : onBook}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    listBox: { flex: 1 },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    bookingsButton: {
      minHeight: 60, borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, marginTop: spacing.sm,
      shadowColor: colors.hero2, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    bookingsIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
    bookingsTexts: { flex: 1 },
    bookingsButtonText: { fontFamily: fonts.headBold, fontSize: 15, color: colors.primaryContrast },
    bookingsSub: { fontFamily: fonts.body, fontSize: 12, color: colors.primaryContrast, opacity: 0.85 },
    bookingsBadge: { minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContrast },
    bookingsBadgeText: { fontFamily: fonts.headBold, fontSize: 14, color: colors.primaryInk },
    filterPill: {
      height: 36, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    filterText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    filterTextActive: { color: colors.primaryContrast },
    sticky: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
    filterRow: { gap: 8 },
    bannerWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    periodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm, marginBottom: 2 },
    periodText: { fontFamily: fonts.headBold, fontSize: 15, color: colors.text },
    periodLine: { flex: 1, height: 1, backgroundColor: colors.border },
    periodCount: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
    list: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: 120 },
    sheetTitle: { fontFamily: fonts.headBold, fontSize: 19, color: colors.text, marginBottom: spacing.sm },
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
