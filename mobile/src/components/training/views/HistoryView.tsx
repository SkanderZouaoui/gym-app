import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useMyWorkouts, type WorkoutLog } from '../../../hooks/useCoaching';
import { useMyBookings } from '../../../hooks/useMe';
import { EmptyState } from '../../ui';
import { formatDurationLabel, workoutSeconds } from '../../../utils/duration';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../../../i18n';
import { WEEKDAYS_LONG_SUN } from '../../../i18n/labels';

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: workouts, isLoading: workoutsLoading, isError: workoutsError, refetch: refetchWorkouts } = useMyWorkouts();
  const { data: bookings, isLoading: bookingsLoading, isError: bookingsError, refetch: refetchBookings } = useMyBookings();

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
    const totalMinutes = recent.reduce((sum, e) => sum + (e.kind === 'workout' ? (workoutSeconds(e.log) ?? 0) / 60 : 0), 0);
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

  const allEntries = useMemo(() => [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)), [entries]);

  if (workoutsLoading || bookingsLoading) return null;

  if (workoutsError && bookingsError && !workouts && !bookings) {
    return (
      <EmptyState
        icon="cloud-off"
        title={t('member.historique_indisponible')}
        text={t('member.impossible_de_recuperer_votre_historique')}
        tone="danger"
        actionLabel={t('common.reessayer')}
        onAction={() => {
          void refetchWorkouts();
          void refetchBookings();
        }}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="history"
        title={t('member.aucune_seance_enregistree')}
        text={t('member.demarrez_une_seance_depuis_un')}
        tone="primary"
      />
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {stats ? (
        <View style={styles.statsRow}>
          <Stat value={String(stats.count)} label={t('member.seances_3_mois')} />
          <Stat value={stats.perWeek} label={t('member.par_semaine')} />
          <Stat value={stats.totalHours ? `${stats.totalHours}h` : '—'} label={t('member.au_total')} />
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        {allEntries.map((entry) =>
          entry.kind === 'workout' ? (
            <WorkoutRow key={entry.id} log={entry.log} isRecord={recordLogIds.has(entry.id)} styles={styles} />
          ) : (
            <ClassRow key={entry.id} date={entry.date} name={entry.name} coachName={entry.coachName} styles={styles} />
          ),
        )}
      </View>
    </View>
  );
}

const DAY_LABELS = WEEKDAYS_LONG_SUN;

function DateBadge({ date, styles }: { date: string; styles: ReturnType<typeof makeStyles> }) {
  const d = new Date(date);
  return (
    <View style={styles.dateBadge}>
      <Text style={styles.dateBadgeMonth}>{d.toLocaleDateString(dateLocale(), { month: 'short' }).replace('.', '').toUpperCase()}.</Text>
      <Text style={styles.dateBadgeDay}>{d.getDate()}</Text>
    </View>
  );
}

function WorkoutRow({ log, isRecord, styles }: { log: WorkoutLog; isRecord: boolean; styles: ReturnType<typeof makeStyles> }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const exerciseCount = new Set(log.sets.map((s) => s.exerciseId)).size;
  const dayLabel = log.day ? (log.day.label ?? DAY_LABELS[log.day.dayOfWeek]) : null;
  const workoutTitle = log.program
    ? `${log.program.name}${dayLabel ? ` · ${dayLabel}` : ''}`
    : `${log.sets[0]?.exercise.name ?? t('member.seance')}${exerciseCount > 1 ? ` + ${exerciseCount - 1} autre${exerciseCount > 2 ? 's' : ''}` : ''}`;
  const volume = workoutVolume(log);
  return (
    <Pressable
      style={({ pressed }) => [styles.logRow, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
      onPress={() => router.push(`/(member)/workout/${log.id}`)}
    >
      <DateBadge date={log.date} styles={styles} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.logNameRow}>
          <Text style={styles.logName} numberOfLines={1}>
            {workoutTitle}
          </Text>
          {isRecord ? (
            <View style={styles.recordBadge}>
              <Text style={styles.recordBadgeText}>{t('member.record')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.logMeta}>{t('member.serie_4', { v1: workoutSeconds(log) !== null ? `${formatDurationLabel(workoutSeconds(log)!)} · ` : '', length: log.sets.length, v5: log.sets.length > 1 ? 's' : '' })}</Text>
        {volume > 0 ? <Text style={styles.logVolume}>{t('member.kg_de_volume', { v0: Math.round(volume).toLocaleString(dateLocale()) })}</Text> : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

function ClassRow({ date, name, coachName, styles }: { date: string; name: string; coachName: string | null; styles: ReturnType<typeof makeStyles> }) {
  const { t } = useTranslation();
  const { cardShadow } = useTheme();
  return (
    <View style={[styles.logRow, cardShadow]}>
      <DateBadge date={date} styles={styles} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.logName} numberOfLines={1}>{t('member.cours', { name })}</Text>
        <Text style={styles.logMeta}>
          {new Date(date).toLocaleDateString(dateLocale(), { hour: '2-digit', minute: '2-digit' })}
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
      flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      paddingVertical: 14, paddingHorizontal: 12, gap: 2,
    },
    statValue: { fontFamily: fonts.head, fontSize: 26, letterSpacing: -1, color: colors.text },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    logRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    dateBadge: {
      width: 58, height: 64, borderRadius: 16, backgroundColor: colors.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    dateBadgeMonth: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.primaryInk },
    dateBadgeDay: { fontFamily: fonts.head, fontSize: 22, lineHeight: 26, color: colors.primaryInk },
    logNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    logName: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, textTransform: 'capitalize' },
    recordBadge: { backgroundColor: '#FBBF24', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
    recordBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 9.5, letterSpacing: 0.3, color: '#3A2500' },
    logMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
    logVolume: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primaryInk, marginTop: 6 },
  });
}
