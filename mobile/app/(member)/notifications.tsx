import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { EmptyState, SkeletonBlock } from '../../src/components/ui';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../../src/hooks/useProfile';

const TYPE_LABELS: Record<string, string> = {
  CLASS_REMINDER: 'Rappel de cours',
  WAITLIST_PROMOTED: 'Liste d’attente',
  MEMBERSHIP_EXPIRING: 'Abonnement',
  ANNOUNCEMENT: 'Annonce de la salle',
  ATTENDANCE_CONFIRMED: 'Présence confirmée',
  MESSAGE: 'Message',
  CHALLENGE: 'Défi',
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const hasUnread = notifications?.some((n) => !n.readAt) ?? false;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Notifications" fallbackHref="/(member)/(tabs)/profile" />
      <ScrollView contentContainerStyle={styles.container}>
        {hasUnread ? (
          <Pressable onPress={() => markAllRead.mutate()} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <View style={{ gap: spacing.sm }}>
            <SkeletonBlock height={64} />
            <SkeletonBlock height={64} />
            <SkeletonBlock height={64} />
          </View>
        ) : notifications?.length ? (
          <View style={styles.list}>
            {notifications.map((n) => (
              <Pressable
                key={n.id}
                style={[styles.row, !n.readAt && styles.rowUnread]}
                onPress={() => !n.readAt && markRead.mutate(n.id)}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.type}>{TYPE_LABELS[n.type] ?? n.type}</Text>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.body}>{n.body}</Text>
                  <Text style={styles.date}>{new Date(n.createdAt).toLocaleDateString('fr-FR')}</Text>
                </View>
                {!n.readAt ? <View style={styles.dot} /> : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="notifications-none"
            title="Aucune notification"
            text="Vos rappels de cours, annonces de la salle et messages apparaîtront ici."
            tone="muted"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
    markAllButton: { alignSelf: 'flex-end', paddingVertical: 6 },
    markAllText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primaryInk },
    list: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    row: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    rowUnread: { backgroundColor: colors.primarySoft },
    type: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
    title: { fontFamily: fonts.headSemiBold, fontSize: 14.5, color: colors.text },
    body: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    date: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted, marginTop: 2 },
    dot: { width: 9, height: 9, borderRadius: 999, backgroundColor: colors.primary, marginTop: 4 },
  });
}
