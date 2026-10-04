import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMe } from '../../src/hooks/useMe';
import { useCoachSessions, type CoachSession } from '../../src/hooks/useCoachSessions';

export default function CoachTodayScreen() {
  const { data: user } = useMe();
  const { data: sessions } = useCoachSessions();

  const today = new Date();
  const todaySessions = (sessions ?? []).filter((s) => {
    const d = new Date(s.startsAt);
    return d.toDateString() === today.toDateString();
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Bonjour {user?.firstName}</Text>
        <Text style={styles.subtitle}>
          {todaySessions.length} cours aujourd'hui
        </Text>
      </View>

      <FlatList
        data={todaySessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <SessionRow session={item} />}
        ListEmptyComponent={<Text style={styles.empty}>Aucun cours prévu aujourd'hui.</Text>}
      />
    </SafeAreaView>
  );
}

function SessionRow({ session }: { session: CoachSession }) {
  const fillRate = session.capacity > 0 ? Math.round((session._count.bookings / session.capacity) * 100) : 0;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/(coach)/scanner', params: { sessionId: session.id } })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.className}>{session.classType.name}</Text>
        <Text style={styles.meta}>
          {new Date(session.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          {session.room ? ` · ${session.room.name}` : ''}
        </Text>
      </View>
      <Text style={styles.fillRate}>{session._count.bookings}/{session.capacity}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 4 },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  empty: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  className: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  fillRate: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
});
