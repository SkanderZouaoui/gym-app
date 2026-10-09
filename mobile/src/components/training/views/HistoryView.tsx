import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useMyWorkouts, type WorkoutLog } from '../../../hooks/useCoaching';
import { useMyBookings } from '../../../hooks/useMe';
import { EmptyState } from '../../ui';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function workoutVolume(log: WorkoutLog) {
  return log.sets.reduce((sum, s) => sum + (Number(s.weightKg) || 0) * (s.reps ?? 0), 0);
}

type HistoryEntry =
  | { kind: 'workout'; id: string; date: string; log: WorkoutLog }
  | { kind: 'class'; id: string; date: string; name: string; coachName: string | null };

/** Vue "Historique" de l'onglet Entraînement — FitZone App Entraînement.dc.html, E1. */
export function HistoryView() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: workouts, isLoading: workoutsLoading } = useMyWorkouts();
  const { data: bookings, isLoading: bookingsLoading } = useMyBookings();

  const entries = useMemo<HistoryEntry[]>(() => {
    const workoutEntries: HistoryEntry[] = (workouts ?? []).map((log) => ({
      kind: 'workout', id: log.id, date: log.date, log,
    }));
    const classEntries: HistoryEntry[] = (bookings ?? [])
      .filter((b) => b.status === 'ATTENDED' && b.session)
      .map((b) => ({
        kind: 'class',
        id: b.id,
        date: b.session!.startsAt,
        name: b.session!.classType.name,
        coachName: b.session!.coach?.user.firstName ?? null,
      }));
    return [...workoutEntries, ...classEntries];
  }, [workouts, bookings]);

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const recent = entries.filter((e) => new Date(e.date) >= threeMonthsAgo);
    const weeks = new Set(recent.map((e) => startOfWeek(new Date(e.date)).toISOString()));
    const totalMinutes = recent.reduce((sum, e) => sum + (e.kind === 'workout' ? e.log.durationMinutes ?? 0 : 0), 0);
    return {
      count: recent.length,
      perWeek: weeks.size > 0 ? (recent.length / weeks.size).toFixed(1) : '0',
      totalHours: totalMinutes > 0 ? (totalMinutes / 60).toFixed(totalMinutes >= 600 ? 0 : 1) : null,
    };
  }, [entries]);

  const recordLogIds = useMemo(() => {
    if (!workouts) return new Set<string>();
    const chronological = [...workouts].sort((a, b) => (a.date < b.date ? -1 : 1));
    const bestByExercise = new Map<string, number>();
    const result = new Set<string>();
    for (const log of chronological) {
      let isRecord = false;
      for (const s of log.sets) {
        const w = Number(s.weightKg) || 0;
        if (w <= 0) continue;
        const prevBest = bestByExercise.get(s.exerciseId) ?? 0;
        if (w > prevBest) {
          bestByExercise.set(s.exerciseId, w);
          isRecord = true;
        }
      }
      if (isRecord) result.add(log.id);
    }
    return result;
  }, [workouts]);

  const groups = useMemo(() => {
    const byWeek = new Map<string, HistoryEntry[]>();
    for (const e of entries) {
      const key = startOfWeek(new Date(e.date)).toISOString();
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push(e);
    }
    return Array.from(byWeek.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([weekStart, items]) => ({
        weekStart: new Date(weekStart),
        items: items.sort((a, b) => (a.date < b.date ? 1 : -1)),
      }));
  }, [entries]);

  if (workoutsLoading || bookingsLoading) return null;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="history"
        title="Aucune séance enregistrée"
        text="Démarrez une séance depuis un programme : charges, répétitions et durée seront gardées ici."
        tone="primary"
      />
    );
  }

  const thisWeekStart = startOfWeek(new Date()).getTime();

  return (
    <View style={{ gap: spacing.md }}>
      {stats ? (
        <View style={styles.statsRow}>
          <Stat value={String(stats.count)} label="séances (3 mois)" />
          <Stat value={stats.perWeek} label="par semaine" />
          <Stat value={stats.totalHours ? `${stats.totalHours}h` : '—'} label="au total" />
        </View>
      ) : null}

      {groups.map(({ weekStart, items }) => {
        const isCurrentWeek = weekStart.getTime() === thisWeekStart;
        const totalMinutes = items.reduce((sum, e) => sum + (e.kind === 'workout' ? e.log.durationMinutes ?? 0 : 0), 0);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return (
          <View key={weekStart.toISOString()} style={{ gap: 8 }}>
            <View style={styles.groupLabelRow}>
              <Text style={styles.groupLabel}>
                {isCurrentWeek ? 'CETTE SEMAINE' : `SEMAINE DU ${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`}
              </Text>
              <Text style={styles.groupLabel}>
                {items.length} séance{items.length > 1 ? 's' : ''}
                {totalMinutes > 0 ? ` · ${hours > 0 ? `${hours} h ${String(mins).padStart(2, '0')}` : `${mins} min`}` : ''}
              </Text>
            </View>
            <View style={styles.groupCard}>
              {items.map((entry) =>
                entry.kind === 'workout' ? (
                  <WorkoutRow key={entry.id} log={entry.log} isRecord={recordLogIds.has(entry.id)} styles={styles} />
                ) : (
                  <ClassRow key={entry.id} date={entry.date} name={entry.name} coachName={entry.coachName} styles={styles} />
                ),
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const WEEKDAY_SHORT = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

function DateBadge({ date, styles }: { date: string; styles: ReturnType<typeof makeStyles> }) {
  const d = new Date(date);
  return (
    <View style={styles.dateBadge}>
      <Text style={styles.dateBadgeWeekday}>{WEEKDAY_SHORT[d.getDay()]}</Text>
      <Text style={styles.dateBadgeDay}>{d.getDate()}</Text>
    </View>
  );
}

function WorkoutRow({ log, isRecord, styles }: { log: WorkoutLog; isRecord: boolean; styles: ReturnType<typeof makeStyles> }) {
  const { colors } = useTheme();
  const exerciseCount = new Set(log.sets.map((s) => s.exerciseId)).size;
  const dayLabel = log.day ? (log.day.label ?? DAY_LABELS[log.day.dayOfWeek]) : null;
  const workoutTitle = log.program
    ? `${log.program.name}${dayLabel ? ` · ${dayLabel}` : ''}`
    : `${log.sets[0]?.exercise.name ?? 'Séance'}${exerciseCount > 1 ? ` + ${exerciseCount - 1} autre${exerciseCount > 2 ? 's' : ''}` : ''}`;
  return (
    <Pressable style={styles.logRow} onPress={() => router.push(`/(member)/workout/${log.id}`)}>
      <DateBadge date={log.date} styles={styles} />
      <View style={{ flex: 1 }}>
        <View style={styles.logNameRow}>
          <Text style={styles.logName} numberOfLines={1}>
            {workoutTitle}
          </Text>
          {isRecord ? (
            <View style={styles.recordBadge}>
              <Text style={styles.recordBadgeText}>RECORD</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.logMeta}>
          {log.durationMinutes ? `${log.durationMinutes} min · ` : ''}
          {log.sets.length} série{log.sets.length > 1 ? 's' : ''}
          {workoutVolume(log) > 0 ? ` · ${Math.round(workoutVolume(log)).toLocaleString('fr-FR')} kg` : ''}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

function ClassRow({ date, name, coachName, styles }: { date: string; name: string; coachName: string | null; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.logRow}>
      <DateBadge date={date} styles={styles} />
      <View style={{ flex: 1 }}>
        <Text style={styles.logName} numberOfLines={1}>{name} (cours)</Text>
        <Text style={styles.logMeta}>
          {new Date(date).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          {coachName ? ` · ${coachName}` : ''}
        </Text>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    statsRow: { flexDirection: 'row', gap: spacing.sm },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: radii.md,
      padding: spacing.md, gap: 2,
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
    },
    statValue: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary },
    statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    groupLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    groupLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.5, color: colors.muted },
    groupCard: {
      backgroundColor: colors.surface, borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
    },
    logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    dateBadge: {
      width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.surface2,
      alignItems: 'center', justifyContent: 'center',
    },
    dateBadgeWeekday: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.3, color: colors.muted },
    dateBadgeDay: { fontFamily: fonts.headBold, fontSize: 16, color: colors.text },
    logNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    logName: { flexShrink: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, textTransform: 'capitalize' },
    recordBadge: { backgroundColor: colors.accent, borderRadius: radii.xs, paddingHorizontal: 6, paddingVertical: 2 },
    recordBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 9.5, letterSpacing: 0.3, color: colors.onAccent },
    logMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  });
}
