import { useMemo } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMe } from '../../src/hooks/useMe';
import { useStaffToday, type StaffTodaySession } from '../../src/hooks/useStaff';

export default function StaffTodayScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const { data } = useStaffToday(user?.homeBranchId ?? undefined);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Aujourd’hui</Text>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.sessions.length ?? 0}</Text>
            <Text style={styles.statLabel}>Cours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.attendedToday ?? 0}</Text>
            <Text style={styles.statLabel}>Présences</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={data?.sessions ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <SessionRow session={item} />}
        ListEmptyComponent={<Text style={styles.empty}>Aucun cours aujourd’hui.</Text>}
      />
    </SafeAreaView>
  );
}

function SessionRow({ session }: { session: StaffTodaySession }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/(staff)/scanner', params: { sessionId: session.id } })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.className}>{session.classTypeName}</Text>
        <Text style={styles.meta}>
          {new Date(session.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          {session.coachName ? ` · ${session.coachName}` : ''}
        </Text>
      </View>
      <Text style={styles.fillRate}>{session.fillRate}%</Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
    title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondaryInk },
    statRow: { flexDirection: 'row', gap: spacing.sm },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1,
      borderColor: colors.border, padding: spacing.sm, gap: 2,
    },
    statValue: { fontFamily: fonts.head, fontSize: 20, color: colors.secondaryInk },
    statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
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
}
