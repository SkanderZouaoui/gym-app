import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachSessions, type CoachSession } from '../../../src/hooks/useCoachSessions';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { DaySelector } from '../../../src/components/adherent/DaySelector';
import { FilterDropdown, ProgressBar, ScreenTitle, SkeletonList } from '../../../src/components/ui';
import { StatusTag } from '../../../src/components/staff/staffUi';
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
        </View>

        <View style={styles.summary}>
          <MaterialIcons name="event" size={18} color={colors.primaryInk} />
          <Text style={[styles.summaryText, { flex: 1 }]}>{i18n.t('staff.cours_inscrit', { length: shown.length, totalBooked, v5: totalBooked > 1 ? 's' : '' })}</Text>
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
        </View>

        <View style={{ gap: 12 }}>
          {shown.map((s) => {
            const st = sessionState(s, now);
            const minutes = Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000);
            const time = new Date(s.startsAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
            const present = s.attendedCount ?? 0;
            return (
              <Pressable
                key={s.id}
                style={({ pressed }) => [styles.card, cardShadow, st.key === 'done' && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={() => router.push(`/(coach)/session/${s.id}`)}
              >
                <View style={styles.cardTop}>
                  <LinearGradient
                    colors={st.key === 'live' ? [colors.success, colors.successInk] : [colors.primary, colors.primaryPressed]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.timeBlock}
                  >
                    <Text style={styles.timeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{time}</Text>
                    <Text style={styles.timeSub}>{i18n.t('staff.min', { minutes })}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={2}>{s.classType.name}</Text>
                    <View style={styles.metaRow}>
                      <MaterialIcons name="meeting-room" size={14} color={colors.muted} />
                      <Text style={styles.meta} numberOfLines={1}>{s.room?.name ?? '—'}</Text>
                      <MaterialIcons name="how-to-reg" size={14} color={colors.muted} />
                      <Text style={styles.meta} numberOfLines={1}>{i18n.t('coach.planning_present', { present, total: s._count.bookings })}</Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <StatusTag label={st.label} tone={st.tone} />
                    </View>
                  </View>
                </View>
                <View style={styles.fillBlock}>
                  <View style={styles.fillRow}>
                    <Text style={styles.fillLabel}>{i18n.t('common.remplissage')}</Text>
                    <Text style={styles.fillValue}>{i18n.t('common.inscrits', { bookings: s._count.bookings, capacity: s.capacity })}</Text>
                  </View>
                  <ProgressBar progress={st.ratio} color={st.ratio >= 1 ? colors.danger : st.ratio >= 0.7 ? colors.warning : colors.primary} />
                </View>
              </Pressable>
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
    card: { padding: 14, gap: 14, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    cardTop: { flexDirection: 'row', gap: 14 },
    timeBlock: { width: 68, minHeight: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    timeText: { fontFamily: fonts.head, fontSize: 20, letterSpacing: -0.6, color: '#FFFFFF' },
    timeSub: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    name: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: colors.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginRight: 8, flexShrink: 1 },
    fillBlock: { gap: 8 },
    fillRow: { flexDirection: 'row', justifyContent: 'space-between' },
    fillLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    fillValue: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  });
}
