import { useMemo } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radii, spacing, typography } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachStudents } from '../../../src/hooks/useCoachSessions';
import { Avatar, EmptyState, SkeletonList } from '../../../src/components/ui';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';

/** Élèves — FitZone App Coach.dc.html, L1. */
export default function CoachStudentsScreen() {
  const pullClient = useQueryClient();
  const { refreshing: pullRefreshing, onRefresh: pullOnRefresh } = useOfflineAwareRefresh(() => pullClient.invalidateQueries());
  const { t } = useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: students, isLoading } = useCoachStudents();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('coach.eleves')}</Text>
        <Text style={styles.count}>{students?.length ?? 0}</Text>
      </View>
      <FlatList
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={pullOnRefresh} />} {...tabBarScroll}
        data={students ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(coach)/student/${item.id}`)}>
            <Avatar initials={`${item.firstName[0]}${item.lastName[0]}`.toUpperCase()} photoUrl={item.photoUrl} />
            <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
          </Pressable>
        )}
        ListEmptyComponent={isLoading ? <SkeletonList count={5} /> : (<EmptyState
            icon="group"
            title={t('coach.pas_encore_deleve_suivi')}
            text={t('coach.les_adherents_apparaissent_ici_apres')}
            tone="muted"
          />)}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg, paddingBottom: spacing.sm },
    title: { ...typography.largeTitle, color: colors.text },
    count: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted },
    list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  });
}
