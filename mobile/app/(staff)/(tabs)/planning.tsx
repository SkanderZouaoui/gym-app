import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useSessions } from '../../../src/hooks/useClasses';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { DaySelector } from '../../../src/components/adherent/DaySelector';
import { FilterDropdown, ProgressBar, ScreenTitle } from '../../../src/components/ui';
import type { ClassSessionSummary } from '../../../src/api/types';
import { StatusTag } from '../../../src/components/staff/staffUi';

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
type StatusFilter = 'all' | 'upcoming' | 'full' | 'low';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'full', label: 'Complets' },
  { value: 'low', label: 'Sous-remplis' },
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

function sessionState(s: ClassSessionSummary, now: number) {
  const start = new Date(s.startsAt).getTime();
  const end = new Date(s.endsAt).getTime();
  const ratio = s._count.bookings / Math.max(1, s.capacity);
  if (end < now) return { key: 'done' as const, label: 'Terminé', tone: 'muted' as const, ratio };
  if (start <= now) return { key: 'live' as const, label: 'En cours', tone: 'success' as const, ratio };
  if (ratio >= 1) return { key: 'full' as const, label: 'Complet', tone: 'danger' as const, ratio };
  if (ratio >= 0.7) return { key: 'almost' as const, label: 'Presque plein', tone: 'warning' as const, ratio };
  return { key: 'open' as const, label: 'Places disponibles', tone: 'muted' as const, ratio };
}

/** Planning de la salle (accueil) : jours, filtres (statut, type de cours, coach) et cartes de cours détaillées. */
export default function StaffPlanningScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: sessions, refetch } = useSessions();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const days = useMemo(() => buildDays(14), []);
  const [selectedDay, setSelectedDay] = useState(0);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<string | null>(null);
  const [coach, setCoach] = useState<string | null>(null);

  const now = Date.now();
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
          title="Planning"
          subtitle={`Cours collectifs · ${day.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
        />

        <DaySelector days={days} selectedIndex={selectedDay} onSelect={setSelectedDay} />

        <View style={styles.filters}>
          <FilterDropdown title="Statut" icon="event-available" value={status} options={STATUS_FILTERS} onChange={setStatus} />
          {types.length > 1 ? (
            <FilterDropdown<string | null>
              title="Cours"
              icon="fitness-center"
              value={activeType}
              options={[{ value: null, label: 'Tous les cours' }, ...types.map((t) => ({ value: t, label: t }))]}
              onChange={setType}
            />
          ) : null}
          {coaches.length > 1 ? (
            <FilterDropdown<string | null>
              title="Coach"
              icon="sports"
              value={activeCoach}
              options={[{ value: null, label: 'Tous les coachs' }, ...coaches.map((c) => ({ value: c, label: c }))]}
              onChange={setCoach}
            />
          ) : null}
        </View>

        <View style={styles.summary}>
          <MaterialIcons name="event" size={18} color={colors.primaryInk} />
          <Text style={[styles.summaryText, { flex: 1 }]}>
            {shown.length} cours · {totalBooked} inscrit{totalBooked > 1 ? 's' : ''}
          </Text>
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
              <Text style={styles.resetText}>Réinitialiser</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          {shown.map((s) => {
            const st = sessionState(s, now);
            const minutes = Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000);
            const time = new Date(s.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return (
              <Pressable
                key={s.id}
                style={({ pressed }) => [styles.card, cardShadow, st.key === 'done' && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={() => router.push({ pathname: '/(staff)/(tabs)/scanner', params: { sessionId: s.id } })}
              >
                <View style={styles.cardTop}>
                  <LinearGradient
                    colors={st.key === 'live' ? [colors.success, colors.successInk] : [colors.primary, colors.primaryPressed]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.timeBlock}
                  >
                    <Text style={styles.timeText}>{time}</Text>
                    <Text style={styles.timeSub}>{minutes} min</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={2}>{s.classType.name}</Text>
                    <View style={styles.metaRow}>
                      <MaterialIcons name="sports" size={14} color={colors.muted} />
                      <Text style={styles.meta} numberOfLines={1}>{s.coach ? `${s.coach.user.firstName} ${s.coach.user.lastName.charAt(0)}.` : 'Sans coach'}</Text>
                      <MaterialIcons name="meeting-room" size={14} color={colors.muted} />
                      <Text style={styles.meta} numberOfLines={1}>{s.room?.name ?? '—'}</Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <StatusTag label={st.label} tone={st.tone} />
                    </View>
                  </View>
                </View>
                <View style={styles.fillBlock}>
                  <View style={styles.fillRow}>
                    <Text style={styles.fillLabel}>Remplissage</Text>
                    <Text style={styles.fillValue}>{s._count.bookings}/{s.capacity} inscrits</Text>
                  </View>
                  <ProgressBar progress={st.ratio} color={st.ratio >= 1 ? colors.danger : st.ratio >= 0.7 ? colors.warning : colors.primary} />
                </View>
              </Pressable>
            );
          })}
          {shown.length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <MaterialIcons name="event-busy" size={34} color={colors.primaryInk} />
              <Text style={styles.emptyText}>Aucun cours ne correspond à ces filtres.</Text>
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
