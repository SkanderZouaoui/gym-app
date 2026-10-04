import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { apiRequest } from '../../src/api/client';

interface CoachProgram {
  id: string;
  name: string;
  assignedTo: { firstName: string; lastName: string };
}

export default function CoachStudentsScreen() {
  const { data: programs } = useQuery({
    queryKey: ['coach', 'programs'],
    queryFn: () => apiRequest<CoachProgram[]>('/v1/coach/programs'),
  });

  const students = Array.from(
    new Map(
      (programs ?? []).map((p) => [
        `${p.assignedTo.firstName}-${p.assignedTo.lastName}`,
        p.assignedTo,
      ]),
    ).values(),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes élèves</Text>
      </View>
      <FlatList
        data={students}
        keyExtractor={(item, i) => `${item.firstName}-${i}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.firstName[0]}
                {item.lastName[0]}
              </Text>
            </View>
            <Text style={styles.name}>
              {item.firstName} {item.lastName}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun élève suivi pour l'instant.</Text>}
      />
    </SafeAreaView>
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
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 999, backgroundColor: colors.secondarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.headBold, color: colors.secondaryInk, fontSize: 13 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
});
