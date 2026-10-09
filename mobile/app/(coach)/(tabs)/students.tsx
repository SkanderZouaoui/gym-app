import { useMemo } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachStudents } from '../../../src/hooks/useCoachSessions';
import { Avatar, EmptyState } from '../../../src/components/ui';

/** Élèves — FitZone App Coach.dc.html, L1. */
export default function CoachStudentsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: students } = useCoachStudents();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Élèves</Text>
        <Text style={styles.count}>{students?.length ?? 0}</Text>
      </View>
      <FlatList
        data={students ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(coach)/student/${item.id}`)}>
            <Avatar initials={`${item.firstName[0]}${item.lastName[0]}`.toUpperCase()} />
            <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="group"
            title="Pas encore d'élève suivi"
            text="Les adhérents apparaissent ici après une séance individuelle ou quand vous leur assignez un programme."
            tone="muted"
          />
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm },
    title: { fontFamily: fonts.head, fontSize: 24, color: colors.text },
    count: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted },
    list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
      borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  });
}
