import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachSessions, type CoachSession } from '../../../src/hooks/useCoachSessions';
import { EmptyState, Pill, ProgressBar } from '../../../src/components/ui';

/** Mon planning — FitZone App Coach.dc.html, I2. */
export default function CoachPlanningScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: sessions } = useCoachSessions();
  const [selectedDay, setSelectedDay] = useState(0);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const daySessions = useMemo(() => {
    const target = days[selectedDay];
    return (sessions ?? []).filter((s) => new Date(s.startsAt).toDateString() === target.toDateString());
  }, [sessions, days, selectedDay]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Planning</Text>
      </View>

      <View style={styles.dayRow}>
        {days.map((d, i) => (
          <Pressable key={d.toISOString()} onPress={() => setSelectedDay(i)} style={[styles.dayCell, i === selectedDay && styles.dayCellActive]}>
            <Text style={[styles.dayLabel, i === selectedDay && styles.dayTextActive]}>
              {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
            </Text>
            <Text style={[styles.dayNumber, i === selectedDay && styles.dayTextActive]}>{d.getDate()}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={daySessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <SessionRow session={item} />}
        ListEmptyComponent={<EmptyState icon="event-busy" title="Rien de prévu" text="Aucun cours ce jour-là." tone="muted" />}
      />
    </SafeAreaView>
  );
}

function SessionRow({ session }: { session: CoachSession }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isFull = session._count.bookings >= session.capacity;
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/(coach)/session/${session.id}`)}>
      <View style={styles.cardTop}>
        <Text style={styles.time}>
          {new Date(session.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.className}>{session.classType.name}</Text>
          {session.room ? <Text style={styles.meta}>{session.room.name}</Text> : null}
        </View>
        <Pill label={isFull ? 'Complet' : `${session._count.bookings}/${session.capacity}`} tone={isFull ? 'danger' : 'secondary'} />
      </View>
      <ProgressBar progress={session.capacity ? session._count.bookings / session.capacity : 0} color={isFull ? colors.danger : colors.primary} />
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { padding: spacing.lg, paddingBottom: spacing.sm },
    title: { fontFamily: fonts.head, fontSize: 24, color: colors.text },
    dayRow: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    dayCell: { flex: 1, height: 56, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', gap: 2 },
    dayCellActive: { backgroundColor: colors.secondary },
    dayLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
    dayNumber: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
    dayTextActive: { color: colors.onSecondary },
    list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 10,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    time: { fontFamily: fonts.headBold, fontSize: 14, color: colors.text, width: 46 },
    className: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  });
}
