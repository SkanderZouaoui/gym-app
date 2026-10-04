import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useCoachSessions, type CoachSession } from '../../src/hooks/useCoachSessions';

export default function CoachPlanningScreen() {
  const { data: sessions } = useCoachSessions();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon planning</Text>
      </View>
      <FlatList
        data={sessions ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <SessionRow session={item} />}
        ListEmptyComponent={<Text style={styles.empty}>Aucune séance à venir.</Text>}
      />
    </SafeAreaView>
  );
}

function SessionRow({ session }: { session: CoachSession }) {
  return (
    <View style={styles.card}>
      <Text style={styles.className}>{session.classType.name}</Text>
      <Text style={styles.meta}>
        {new Date(session.startsAt).toLocaleString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  empty: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 4,
  },
  className: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
});
