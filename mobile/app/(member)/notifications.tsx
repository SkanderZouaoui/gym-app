import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { EmptyState, SkeletonBlock, Toast } from '../../src/components/ui';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../../src/hooks/useProfile';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';

const TYPES: Record<string, { label: string; icon: keyof typeof MaterialIcons.glyphMap; tone: 'primary' | 'success' | 'warning' | 'muted' }> = {
  CLASS_REMINDER: { label: 'Rappel de cours', icon: 'alarm', tone: 'primary' },
  WAITLIST_PROMOTED: { label: 'Liste d’attente', icon: 'event-available', tone: 'success' },
  MEMBERSHIP_EXPIRING: { label: 'Abonnement', icon: 'card-membership', tone: 'warning' },
  ANNOUNCEMENT: { label: 'Annonce de la salle', icon: 'campaign', tone: 'primary' },
  ATTENDANCE_CONFIRMED: { label: 'Présence confirmée', icon: 'check-circle', tone: 'success' },
  MESSAGE: { label: 'Message', icon: 'chat-bubble', tone: 'primary' },
  CHALLENGE: { label: 'Défi', icon: 'emoji-events', tone: 'warning' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'À l’instant';
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function dayGroup(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  if (diffDays <= 0) return 'Aujourd’hui';
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return 'Cette semaine';
  return 'Plus ancien';
}

export default function NotificationsScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: notifications, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);

  const unread = notifications?.filter((n) => !n.readAt).length ?? 0;

  const groups = useMemo(() => {
    const order = ['Aujourd’hui', 'Hier', 'Cette semaine', 'Plus ancien'];
    const map = new Map<string, NonNullable<typeof notifications>>();
    for (const n of notifications ?? []) {
      const g = dayGroup(n.createdAt);
      map.set(g, [...(map.get(g) ?? []), n]);
    }
    return order.filter((g) => map.has(g)).map((g) => ({ title: g, items: map.get(g)! }));
  }, [notifications]);

  const toneColors = {
    primary: { bg: colors.primarySoft, fg: colors.primaryInk },
    success: { bg: colors.successSoft, fg: colors.successInk },
    warning: { bg: colors.warningSoft, fg: colors.warningInk },
    muted: { bg: colors.surface2, fg: colors.muted },
  } as const;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Notifications" fallbackHref="/(member)/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {notifications?.length ? (
          <View style={styles.summary}>
            <View style={styles.summaryLeft}>
              <View style={[styles.countBadge, unread === 0 && { backgroundColor: colors.surface2 }]}>
                <Text style={[styles.countText, unread === 0 && { color: colors.muted }]}>{unread}</Text>
              </View>
              <Text style={styles.summaryText}>{unread === 0 ? 'Tout est à jour' : unread === 1 ? 'notification non lue' : 'notifications non lues'}</Text>
            </View>
            {unread > 0 ? (
              <Pressable onPress={() => markAllRead.mutate()} style={({ pressed }) => [styles.markAll, pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="done-all" size={16} color={colors.primaryInk} />
                <Text style={styles.markAllText}>Tout lire</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {isLoading ? (
          <View style={{ gap: spacing.sm }}>
            <SkeletonBlock height={84} />
            <SkeletonBlock height={84} />
            <SkeletonBlock height={84} />
          </View>
        ) : groups.length ? (
          groups.map((g) => (
            <View key={g.title} style={{ gap: 10 }}>
              <Text style={styles.groupTitle}>{g.title}</Text>
              {g.items.map((n) => {
                const meta = TYPES[n.type] ?? { label: n.type, icon: 'notifications' as const, tone: 'muted' as const };
                const tone = toneColors[meta.tone];
                const isUnread = !n.readAt;
                return (
                  <Pressable
                    key={n.id}
                    style={({ pressed }) => [styles.card, cardShadow, isUnread && styles.cardUnread, pressed && { transform: [{ scale: 0.98 }] }]}
                    onPress={() => isUnread && markRead.mutate(n.id)}
                  >
                    <View style={[styles.iconTile, { backgroundColor: tone.bg }]}>
                      <MaterialIcons name={meta.icon} size={22} color={tone.fg} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={styles.topRow}>
                        <Text style={[styles.type, { color: tone.fg }]} numberOfLines={1}>{meta.label}</Text>
                        <Text style={styles.time}>{relativeTime(n.createdAt)}</Text>
                        {isUnread ? <View style={styles.dot} /> : null}
                      </View>
                      <Text style={[styles.title, !isUnread && { fontFamily: fonts.bodySemiBold }]}>{n.title}</Text>
                      <Text style={styles.body}>{n.body}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        ) : (
          <EmptyState
            icon="notifications-none"
            title="Aucune notification"
            text="Vos rappels de cours, annonces de la salle et messages apparaîtront ici."
            tone="muted"
          />
        )}
      </ScrollView>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text="Pas de connexion — impossible d’actualiser" iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 4, gap: spacing.md, paddingBottom: 120 },
    summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    countBadge: { minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    countText: { fontFamily: fonts.head, fontSize: 14, color: colors.primaryContrast },
    summaryText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    markAll: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17,
      backgroundColor: colors.primarySoft,
    },
    markAllText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    groupTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted, marginTop: 4 },
    card: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    cardUnread: { borderColor: colors.primaryBorder },
    iconTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    type: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
    time: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
    title: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
    dot: { width: 9, height: 9, borderRadius: 999, backgroundColor: colors.primary },
  });
}
