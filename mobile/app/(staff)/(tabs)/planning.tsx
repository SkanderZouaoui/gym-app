import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useSessions } from '../../../src/hooks/useClasses';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { DaySelector } from '../../../src/components/adherent/DaySelector';
import { FilterDropdown, ScreenTitle, SkeletonList } from '../../../src/components/ui';
import { SessionPlanningCard, sessionState } from '../../../src/components/staff/SessionPlanningCard';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../../src/i18n';
import { WEEKDAYS_SHORT_SUN } from '../../../src/i18n/labels';
import { useNow } from '../../../src/hooks/useNow';

const WEEKDAYS = WEEKDAYS_SHORT_SUN;
type StatusFilter = 'all' | 'upcoming' | 'full' | 'low';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', get label() { return i18n.t('common.tous'); } },
  { value: 'upcoming', get label() { return i18n.t('common.a_venir'); } },
  { value: 'full', get label() { return i18n.t('staff.complets'); } },
  { value: 'low', get label() { return i18n.t('staff.sous_remplis'); } },
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

/** Planning de la salle (accueil) : jours, filtres (statut, type de cours, coach) et cartes de cours détaillées. */
export default function StaffPlanningScreen() {
  useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: sessions, refetch, isLoading } = useSessions();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const days = useMemo(() => buildDays(14), []);
  const [selectedDay, setSelectedDay] = useState(0);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<string | null>(null);
  const [coach, setCoach] = useState<string | null>(null);

  const now = useNow();
  const day = days[selectedDay].date;
  const daySessions = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => new Date(s.startsAt).toDateString() === day.toDateString())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [sessions, day],
  );
  const types = useMemo(() => Array.from(new Set(daySessions.map((s) => s.classType.name))).sort(), [daySessions]);
  const coaches = useMemo(
    () => Array.from(new Set(daySessions.map((s) => s.coach?.user.firstName).filter((c): c is string => !!c))).sort(),
    [daySessions],
  );
  const activeType = type && types.includes(type) ? type : null;
  const activeCoach = coach && coaches.includes(coach) ? coach : null;

  const shown = daySessions.filter((s) => {
    const st = sessionState(s, now);
    if (activeType && s.classType.name !== activeType) return false;
    if (activeCoach && s.coach?.user.firstName !== activeCoach) return false;
    if (status === 'upcoming') return st.key !== 'done';
    if (status === 'full') return s._count.bookings >= s.capacity;
    if (status === 'low') return st.key !== 'done' && st.ratio < 0.5;
    return true;
  });
  const totalBooked = shown.reduce((n, s) => n + s._count.bookings, 0);

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

        <DaySelector days={days} selectedIndex={selectedDay} onSelect={setSelectedDay} />

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
          {coaches.length > 1 ? (
            <FilterDropdown<string | null>
              title={i18n.t('common.coach')}
              icon="sports"
              value={activeCoach}
              options={[{ value: null, label: i18n.t('staff.tous_les_coachs') }, ...coaches.map((c) => ({ value: c, label: c }))]}
              onChange={setCoach}
            />
          ) : null}
        </View>

        <View style={styles.summary}>
          <MaterialIcons name="event" size={18} color={colors.primaryInk} />
          <Text style={[styles.summaryText, { flex: 1 }]}>{i18n.t('staff.cours_inscrit', { length: shown.length, totalBooked, v5: totalBooked > 1 ? 's' : '' })}</Text>
          {status !== 'all' || activeType || activeCoach ? (
            <Pressable
              onPress={() => {
                setStatus('all');
                setType(null);
                setCoach(null);
              }}
              hitSlop={8}
              style={styles.reset}
            >
              <MaterialIcons name="close" size={16} color={colors.primaryInk} />
              <Text style={styles.resetText}>{i18n.t('staff.reinitialiser')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          {shown.map((s) => {
            const st = sessionState(s, now);
            return (
              <SessionPlanningCard
                key={s.id}
                session={s}
                now={now}
                onPress={() => router.push({ pathname: '/(staff)/session/[id]', params: { id: s.id } } as never)}
                action={
                  st.key !== 'done' && st.key !== 'cancelled' ? (
                    <Pressable
                      onPress={() => router.push({ pathname: '/(staff)/(tabs)/scanner', params: { sessionId: s.id } })}
                      hitSlop={6}
                      style={({ pressed }) => [styles.scanQuick, pressed && { transform: [{ scale: 0.92 }] }]}
                      accessibilityRole="button"
                      accessibilityLabel={i18n.t('coach.home_scan')}
                    >
                      <MaterialIcons name="qr-code-scanner" size={22} color={colors.primaryContrast} />
                    </Pressable>
                  ) : null
                }
              />
            );
          })}
          {isLoading ? <SkeletonList count={3} height={120} /> : shown.length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <MaterialIcons name="event-busy" size={34} color={colors.primaryInk} />
              <Text style={styles.emptyText}>{i18n.t('staff.aucun_cours_ne_correspond_a')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    summary: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reset: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft },
    resetText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
    summaryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
    scanQuick: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  });
}
