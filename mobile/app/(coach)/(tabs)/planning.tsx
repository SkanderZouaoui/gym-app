import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachSessions, type CoachSession } from '../../../src/hooks/useCoachSessions';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { VenueHoursStrip } from '../../../src/components/venue/VenueHoursStrip';
import { DaySelector } from '../../../src/components/adherent/DaySelector';
import { FilterDropdown, ScreenTitle, SkeletonList } from '../../../src/components/ui';
import { DayStats } from '../../../src/components/planning/DayStats';
import { SessionTimeline, type TimelineSession } from '../../../src/components/planning/SessionTimeline';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../../src/i18n';
import { WEEKDAYS_SHORT_SUN } from '../../../src/i18n/labels';
import { useNow } from '../../../src/hooks/useNow';

const WEEKDAYS = WEEKDAYS_SHORT_SUN;
type StatusFilter = 'all' | 'upcoming' | 'toValidate';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', get label() { return i18n.t('common.tous'); } },
  { value: 'upcoming', get label() { return i18n.t('common.a_venir'); } },
  { value: 'toValidate', get label() { return i18n.t('coach.planning_to_validate'); } },
];

function buildDays(count: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return { label: WEEKDAYS[date.getDay()], dayNumber: String(date.getDate()), date };
  });
}

function sessionState(s: CoachSession, now: number) {
  const start = new Date(s.startsAt).getTime();
  const end = new Date(s.endsAt).getTime();
  const ratio = s._count.bookings / Math.max(1, s.capacity);
  if (end < now) return { key: 'done' as const, label: i18n.t('common.termine'), tone: 'muted' as const, ratio };
  if (start <= now) return { key: 'live' as const, label: i18n.t('common.en_cours'), tone: 'success' as const, ratio };
  if (ratio >= 1) return { key: 'full' as const, label: i18n.t('common.complet'), tone: 'danger' as const, ratio };
  if (ratio >= 0.7) return { key: 'almost' as const, label: i18n.t('common.presque_plein'), tone: 'warning' as const, ratio };
  return { key: 'open' as const, label: i18n.t('staff.places_disponibles'), tone: 'muted' as const, ratio };
}

/** Planning du coach : même présentation que le planning de l'accueil (jours, filtres, cartes de cours détaillées), limité à ses cours. */
export default function CoachPlanningScreen() {
  useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: sessions, refetch, isLoading } = useCoachSessions();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const days = useMemo(() => buildDays(14), []);
  const [selectedDay, setSelectedDay] = useState(0);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<string | null>(null);

  const now = useNow();
  const day = days[selectedDay].date;
  const daySessions = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => new Date(s.startsAt).toDateString() === day.toDateString())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [sessions, day],
  );
  const counts = useMemo(() => days.map((d) => (sessions ?? []).filter((s) => new Date(s.startsAt).toDateString() === d.date.toDateString()).length), [sessions, days]);
  const types = useMemo(() => Array.from(new Set(daySessions.map((s) => s.classType.name))).sort(), [daySessions]);
  const activeType = type && types.includes(type) ? type : null;

  const shown = daySessions.filter((s) => {
    const st = sessionState(s, now);
    if (activeType && s.classType.name !== activeType) return false;
    if (status === 'upcoming') return st.key !== 'done';
    if (status === 'toValidate') return new Date(s.startsAt).getTime() <= now && (s.attendedCount ?? 0) < s._count.bookings;
    return true;
  });
  const totalBooked = shown.reduce((n, s) => n + s._count.bookings, 0);
  const totalPresent = shown.reduce((n, s) => n + (s.attendedCount ?? 0), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenTitle
          title={i18n.t('common.planning')}
          subtitle={i18n.t('staff.cours_collectifs', { v0: day.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' }) })}
        />

        <DaySelector days={days} selectedIndex={selectedDay} onSelect={setSelectedDay} counts={counts} />
        <VenueHoursStrip date={day} href="/(coach)/venue" />

        <View style={styles.filters}>
          <FilterDropdown title={i18n.t('staff.statut')} icon="event-available" value={status} options={STATUS_FILTERS} onChange={setStatus} />
          {types.length > 1 ? (
            <FilterDropdown<string | null>
              title={i18n.t('common.cours_2')}
              icon="fitness-center"
              value={activeType}
              options={[{ value: null, label: i18n.t('staff.tous_les_cours') }, ...types.map((t) => ({ value: t, label: t }))]}
              onChange={setType}
            />
          ) : null}
        </View>

        <DayStats
          stats={[
            { icon: 'event', value: String(shown.length), label: i18n.t('staff.stat_courses') },
            { icon: 'groups', value: String(totalBooked), label: i18n.t('staff.stat_booked') },
            { icon: 'how-to-reg', value: String(totalPresent), label: i18n.t('staff.stat_present') },
          ]}
        />

        {status !== 'all' || activeType ? (
          <Pressable
            onPress={() => {
              setStatus('all');
              setType(null);
            }}
            hitSlop={8}
            style={styles.reset}
          >
            <MaterialIcons name="close" size={16} color={colors.primaryInk} />
            <Text style={styles.resetText}>{i18n.t('staff.reinitialiser')}</Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <SkeletonList count={3} height={120} />
        ) : shown.length === 0 ? (
          <View style={[styles.empty, cardShadow]}>
            <MaterialIcons name="event-busy" size={34} color={colors.primaryInk} />
            <Text style={styles.emptyText}>{i18n.t('staff.aucun_cours_ne_correspond_a')}</Text>
          </View>
        ) : (
          <SessionTimeline
            now={now}
            isToday={selectedDay === 0}
            sessions={shown.map<TimelineSession>((s) => ({
              id: s.id,
              startsAt: s.startsAt,
              endsAt: s.endsAt,
              title: s.classType.name,
              meta: [s.room?.name, i18n.t('coach.planning_present', { present: s.attendedCount ?? 0, total: s._count.bookings })].filter((m): m is string => !!m),
              booked: s._count.bookings,
              capacity: s.capacity,
              state: sessionState(s, now),
            }))}
            onPress={(id) => router.push(`/(coach)/session/${id}`)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    reset: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft },
    resetText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  });
}
