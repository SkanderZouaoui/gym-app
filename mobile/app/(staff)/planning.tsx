import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useSessions } from '../../src/hooks/useClasses';

export default function StaffPlanningScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: sessions } = useSessions();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Planning du site</Text>
      </View>
      <FlatList
        data={sessions ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.className}>{item.classType.name}</Text>
              <Text style={styles.meta}>
                {new Date(item.startsAt).toLocaleString('fr-FR', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {item.coach ? ` · ${item.coach.user.firstName}` : ''}
              </Text>
            </View>
            <Text style={styles.count}>{item._count.bookings}/{item.capacity}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun cours programmé.</Text>}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { padding: spacing.lg, paddingBottom: spacing.sm },
    title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondaryInk },
    list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
    empty: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 40 },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    className: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    count: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
  });
}
