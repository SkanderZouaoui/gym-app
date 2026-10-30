import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Easing, Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from './ScreenHeader';
import { EmptyState, SkeletonList } from './ui';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useDeleteNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../hooks/useProfile';
import { useHomeAlertsHistory } from '../hooks/useHomeAlerts';
import { useMyAnnouncementsHistory } from '../hooks/useAnnouncements';
import { useOfflineAwareRefresh } from '../hooks/useOfflineAwareRefresh';
import { dateLocale } from '../i18n';

type Tab = 'notifications' | 'announcements' | 'alerts';

const TYPE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  CLASS_REMINDER: 'alarm',
  WAITLIST_PROMOTED: 'event-available',
  MEMBERSHIP_EXPIRING: 'card-membership',
  ANNOUNCEMENT: 'campaign',
  ATTENDANCE_CONFIRMED: 'check-circle',
  PERSONAL_RECORD: 'emoji-events',
};

type Row = { id: string; title: string; body: string; date: string; icon: keyof typeof MaterialIcons.glyphMap; tone: 'primary' | 'warning' | 'danger'; unread?: boolean; ended?: boolean };

/** Notifications de l'équipe (accueil, coach) : notifications reçues, annonces et alertes, y compris passées. */
export function TeamNotificationsScreen({ fallbackHref }: { fallbackHref: string }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('notifications');
  const client = useQueryClient();
  const notifs = useNotifications();
  const news = useMyAnnouncementsHistory();
  const alerts = useHomeAlertsHistory();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => client.invalidateQueries({ queryKey: ['me'] }));

  const today = new Date().toISOString().slice(0, 10);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });

  const rows: Record<Tab, Row[]> = {
    notifications: (notifs.data ?? []).map((n) => {
      const d = (n.data ?? {}) as Record<string, string | number>;
      if (n.type === 'ADMIN_PAYMENT')
        return { id: n.id, title: t('common.notif_admin_payment'), body: t('common.notif_admin_payment_body', { amount: d.amount, method: d.method, member: d.memberName, actor: d.actorName }), date: n.createdAt, icon: 'payments' as const, tone: 'primary' as const, unread: !n.readAt };
      if (n.type === 'ADMIN_NEW_MEMBER')
        return { id: n.id, title: t('common.notif_admin_member'), body: t('common.notif_admin_member_body', { member: d.memberName, actor: d.actorName }), date: n.createdAt, icon: 'person-add' as const, tone: 'primary' as const, unread: !n.readAt };
      const icon = TYPE_ICONS[n.type] ?? 'notifications';
      return { id: n.id, title: n.title, body: n.body, date: n.createdAt, icon, tone: 'primary' as const, unread: !n.readAt };
    }),
    announcements: (news.data ?? []).map((a) => ({
      id: a.id, title: a.title, body: a.body, date: a.sentAt ?? a.createdAt, icon: 'campaign', tone: a.tone === 'danger' ? 'danger' : a.tone === 'accent' ? 'warning' : 'primary',
      ended: !!a.endsOn && a.endsOn.slice(0, 10) < today,
    })),
    alerts: (alerts.data ?? []).map((a) => ({
      id: a.id, title: a.title, body: a.message, date: a.startsOn ?? '', icon: 'warning-amber', tone: a.level === 'urgent' ? 'danger' : a.level === 'warn' ? 'warning' : 'primary',
      ended: (!!a.endsOn && a.endsOn.slice(0, 10) < today) || a.isActive === false,
    })),
  };
  const loading = tab === 'notifications' ? notifs.isLoading : tab === 'announcements' ? news.isLoading : alerts.isLoading;
  const unread = (notifs.data ?? []).filter((n) => !n.readAt).length;
  const tones = {
    primary: { bg: colors.primarySoft, fg: colors.primaryInk },
    warning: { bg: colors.warningSoft, fg: colors.warningInk },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  } as const;
  const list = rows[tab];
  const groups = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const keyOf = (iso: string) => {
      if (!iso) return 'older';
      const d = new Date(iso);
      const diff = Math.floor((startOfToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
      return diff <= 0 ? 'today' : diff === 1 ? 'yesterday' : diff < 7 ? 'week' : 'older';
    };
    const map = new Map<string, Row[]>();
    for (const r of list) map.set(keyOf(r.date), [...(map.get(keyOf(r.date)) ?? []), r]);
    return ['today', 'yesterday', 'week', 'older'].filter((k) => map.has(k)).map((k) => ({ key: k, items: map.get(k)! }));
  }, [list]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={t('common.notifications')} fallbackHref={fallbackHref} />
      <View style={styles.tabs}>
        {(['notifications', 'announcements', 'alerts'] as const).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
            <Text style={[styles.tabText, tab === k && { color: colors.primaryContrast }]} numberOfLines={1}>
              {t(`common.notif_tab_${k}`)}{k === 'notifications' && unread > 0 ? ` (${unread})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {tab === 'notifications' && unread > 0 ? (
          <Pressable onPress={() => markAll.mutate()} style={styles.markAll}>
            <MaterialIcons name="done-all" size={16} color={colors.primaryInk} />
            <Text style={styles.markAllText}>{t('member.tout_lire')}</Text>
          </Pressable>
        ) : null}
        {loading ? (
          <SkeletonList count={4} height={84} />
        ) : list.length === 0 ? (
          <EmptyState icon="notifications-none" title={t('common.notif_empty')} text={t('common.notif_empty_text')} tone="muted" />
        ) : (
          groups.map((g) => (
            <View key={g.key} style={{ gap: 10 }}>
              <Text style={styles.groupTitle}>{t(`member.group_${g.key}`)}</Text>
              {g.items.map((r) => {
            const tone = tones[r.tone];
            const card = (
              <Pressable
                key={r.id}
                disabled={tab !== 'notifications' || !r.unread}
                onPress={() => markRead.mutate(r.id)}
                style={[styles.card, cardShadow, r.unread && { borderColor: colors.primaryBorder }, r.ended && { opacity: 0.65 }]}
              >
                <View style={[styles.iconTile, { backgroundColor: tone.bg }]}>
                  <MaterialIcons name={r.icon} size={22} color={tone.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <View style={styles.topRow}>
                    <Text style={styles.time}>{r.date ? fmt(r.date) : ''}</Text>
                    {r.ended ? <Text style={styles.ended}>{t('common.notif_ended')}</Text> : null}
                    {r.unread ? <View style={styles.dot} /> : null}
                  </View>
                  <Text style={styles.title}>{r.title}</Text>
                  <Text style={styles.body}>{r.body}</Text>
                </View>
              </Pressable>
            );
            // Seules les notifications reçues se suppriment (balayage vers la gauche) ; annonces et alertes restent consultables.
            if (tab !== 'notifications') return card;
            return (
              <SwipeDelete key={r.id} onDelete={() => deleteNotif.mutate(r.id)} label={t('member.supprimer')}>
                {card}
              </SwipeDelete>
            );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 8 },
    tab: { flex: 1, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, paddingHorizontal: 8 },
    tabOn: { backgroundColor: colors.primary },
    tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    container: { padding: spacing.lg, paddingTop: 4, gap: 10, paddingBottom: 80 },
    markAll: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: colors.primarySoft },
    markAllText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    groupTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted, marginTop: 4 },
    deleteAction: { width: 96, marginStart: 8, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.danger },
    deleteText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#fff' },
    card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    iconTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    time: { flex: 1, fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
    ended: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
    title: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
    dot: { width: 9, height: 9, borderRadius: 999, backgroundColor: colors.primary },
  });
}

const ACTION_W = 96;
/** Au-delà de ce déplacement, un second balayage supprime directement. */
const SECOND_SWIPE = ACTION_W + 70;

function DeleteAction({ drag, armed, mirror, onTrigger, label }: { drag: SharedValue<number>; armed: SharedValue<boolean>; mirror: SharedValue<number>; onTrigger: () => void; label: string }) {
  const { colors } = useTheme();
  // Premier balayage : le bouton se dévoile ; un second balayage plus loin (ou un appui sur le bouton) supprime.
  useAnimatedReaction(
    () => Math.abs(drag.value),
    (v) => {
      mirror.value = v;
      if (armed.value && v > SECOND_SWIPE) {
        armed.value = false;
        runOnJS(onTrigger)();
      }
    },
  );
  return (
    <Pressable
      onPress={onTrigger}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: ACTION_W, marginStart: 8, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.danger }}
    >
      <MaterialIcons name="delete-outline" size={26} color="#fff" />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: '#fff' }}>{label}</Text>
    </Pressable>
  );
}

function SwipeDelete({ children, onDelete, label }: { children: React.ReactNode; onDelete: () => void; label: string }) {
  const armed = useSharedValue(false);
  const mirror = useSharedValue(0); // déplacement du balayage, relayé par la zone d'action
  const collapse = useSharedValue(0); // 0 = visible, 1 = disparue
  const height = useSharedValue(0);
  const busy = useSharedValue(false);

  const trigger = () => {
    if (busy.value) return;
    busy.value = true;
    collapse.value = withTiming(1, { duration: 440, easing: Easing.bezier(0.32, 0.72, 0, 1) }, (finished) => {
      if (finished) runOnJS(onDelete)();
    });
  };

  // Pendant le second balayage, la carte s'estompe et rétrécit comme si elle disparaissait.
  const cardStyle = useAnimatedStyle(() => {
    const k = armed.value || busy.value ? interpolate(mirror.value, [ACTION_W, SECOND_SWIPE], [0, 1], Extrapolation.CLAMP) : 0;
    return { opacity: 1 - 0.65 * k, transform: [{ scale: 1 - 0.05 * k }] };
  });
  // À la suppression, en deux temps enchaînés : la carte file vers la gauche en s'effaçant (0 → 55 %),
  // puis la ligne se referme (35 → 100 %) pour que les cartes du dessous remontent sans à-coup.
  const rowStyle = useAnimatedStyle(() => {
    const c = collapse.value;
    const out = interpolate(c, [0, 0.55], [0, 1], Extrapolation.CLAMP);
    const close = interpolate(c, [0.35, 1], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: 1 - out,
      transform: [{ translateX: -out * 140 }],
      ...(height.value > 0 && c > 0 ? { height: height.value * (1 - close), overflow: 'hidden' as const } : null),
    };
  });

  return (
    <Animated.View style={rowStyle} onLayout={(e) => { if (!busy.value) height.value = e.nativeEvent.layout.height; }}>
      <ReanimatedSwipeable
        friction={1.5}
        overshootRight
        // Il faut un vrai mouvement horizontal (32 px) pour déclencher le balayage : un défilement vertical un peu de travers ne le capte plus.
        dragOffsetFromRight={-32}
        rightThreshold={ACTION_W / 2}
        onSwipeableOpen={() => { armed.value = true; }}
        onSwipeableClose={() => { armed.value = false; }}
        renderRightActions={(_progress, drag) => <DeleteAction drag={drag} armed={armed} mirror={mirror} onTrigger={trigger} label={label} />}
      >
        <Animated.View style={cardStyle}>{children}</Animated.View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}
