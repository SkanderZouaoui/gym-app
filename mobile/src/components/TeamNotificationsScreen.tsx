import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Easing, Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from './ScreenHeader';
import { BottomSheet, EmptyState, SectionHeader, SkeletonList } from './ui';
import { Button } from './Button';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useDeleteAllNotifications, useDeleteNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../hooks/useProfile';
import { useMyAnnouncementsHistory } from '../hooks/useAnnouncements';
import { useOfflineAwareRefresh } from '../hooks/useOfflineAwareRefresh';
import { dateLocale } from '../i18n';
import { router } from 'expo-router';
import { useSessionStore } from '../store/session';
import { notificationTarget, type AppRole, type NotificationTarget } from '../notifications/targets';

type Tab = 'notifications' | 'announcements';

const TYPE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  CLASS_REMINDER: 'alarm',
  WAITLIST_PROMOTED: 'event-available',
  MEMBERSHIP_EXPIRING: 'card-membership',
  ANNOUNCEMENT: 'campaign',
  ATTENDANCE_CONFIRMED: 'check-circle',
  PERSONAL_RECORD: 'emoji-events',
};

type Row = { target?: NotificationTarget | null; id: string; title: string; body: string; date: string; icon: keyof typeof MaterialIcons.glyphMap; tone: 'primary' | 'warning' | 'danger'; unread?: boolean; ended?: boolean };

/** Notifications reçues et annonces (y compris passées). */
export function TeamNotificationsScreen({ fallbackHref }: { fallbackHref: string }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('notifications');
  const client = useQueryClient();
  const notifs = useNotifications();
  const news = useMyAnnouncementsHistory();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();
  const [confirmAll, setConfirmAll] = useState(false);
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => client.invalidateQueries({ queryKey: ['me'] }));

  const role = (useSessionStore((st) => st.activeRole) ?? 'MEMBER') as AppRole;
  const reduceMotion = useReducedMotion();
  const [segWidth, setSegWidth] = useState(0);
  const tabIndex = tab === 'notifications' ? 0 : 1;
  const itemW = segWidth > 0 ? (segWidth - 8 - 4) / 2 : 0;
  const thumbX = useSharedValue(4);
  useEffect(() => {
    const x = 4 + tabIndex * (itemW + 4);
    thumbX.value = reduceMotion ? x : withTiming(x, { duration: 260, easing: Easing.bezier(0.3, 0.9, 0.3, 1) });
  }, [tabIndex, itemW, reduceMotion, thumbX]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbX.value }] }));

  const today = new Date().toISOString().slice(0, 10);
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // Aujourd'hui / hier : l'heure suffit (le titre du groupe donne le jour) ; plus ancien : la date.
    if (sameDay(d, new Date()) || sameDay(d, yesterday)) return d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const rows: Record<Tab, Row[]> = {
    notifications: (notifs.data ?? []).map((n) => {
      const d = (n.data ?? {}) as Record<string, string | number>;
      const target = notificationTarget(n.type, n.data, role);
      if (n.type === 'ADMIN_PAYMENT')
        return { id: n.id, title: t('common.notif_admin_payment'), body: t('common.notif_admin_payment_body', { amount: d.amount, method: d.method, member: d.memberName, actor: d.actorName }), date: n.createdAt, icon: 'payments' as const, tone: 'primary' as const, unread: !n.readAt, target };
      if (n.type === 'ADMIN_NEW_MEMBER')
        return { id: n.id, title: t('common.notif_admin_member'), body: t('common.notif_admin_member_body', { member: d.memberName, actor: d.actorName }), date: n.createdAt, icon: 'person-add' as const, tone: 'primary' as const, unread: !n.readAt, target };
      const icon = TYPE_ICONS[n.type] ?? 'notifications';
      return { id: n.id, title: n.title, body: n.body, date: n.createdAt, icon, tone: 'primary' as const, unread: !n.readAt, target };
    }),
    announcements: (news.data ?? []).map((a) => ({
      id: a.id, title: a.title, body: a.body, date: a.sentAt ?? a.createdAt, icon: 'campaign', tone: a.tone === 'danger' ? 'danger' : a.tone === 'accent' ? 'warning' : 'primary',
      ended: !!a.endsOn && a.endsOn.slice(0, 10) < today,
    })),
  };
  const loading = tab === 'notifications' ? notifs.isLoading : news.isLoading;
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
      <View style={styles.tabsWrap}>
        <View style={styles.tabs} onLayout={(e) => setSegWidth(e.nativeEvent.layout.width)}>
          {itemW > 0 ? <Animated.View pointerEvents="none" style={[styles.thumb, { width: itemW }, thumbStyle]} /> : null}
          {(['notifications', 'announcements'] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={styles.tab} accessibilityRole="button" accessibilityState={{ selected: tab === k }}>
              <Text style={[styles.tabText, tab === k && styles.tabTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {t(`common.notif_tab_${k}`)}
              </Text>
              {k === 'notifications' && unread > 0 ? (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{unread}</Text></View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {tab === 'notifications' && !loading && list.length > 0 ? (
          <View style={styles.actionsRow}>
            {unread > 0 ? (
              <Pressable onPress={() => markAll.mutate()} style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="done-all" size={16} color={colors.primaryInk} />
                <Text style={styles.actionPillText}>{t('member.tout_lire')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setConfirmAll(true)} style={({ pressed }) => [styles.actionPill, styles.actionPillDanger, pressed && { opacity: 0.7 }]}>
              <MaterialIcons name="delete-outline" size={17} color={colors.dangerInk} />
              <Text style={[styles.actionPillText, { color: colors.dangerInk }]}>{t('member.delete_all')}</Text>
            </Pressable>
          </View>
        ) : null}
        {loading ? (
          <SkeletonList count={4} height={84} />
        ) : list.length === 0 ? (
          <EmptyState icon="notifications-none" title={t('common.notif_empty')} text={t('common.notif_empty_text')} tone="muted" />
        ) : (
          groups.map((g) => (
            <View key={g.key} style={{ gap: 10 }}>
              <SectionHeader
                title={t(`member.group_${g.key}`)}
                style={styles.groupHeader}
              />
              {g.items.map((r) => {
            const tone = tones[r.tone];
            const card = (
              <Pressable
                key={r.id}
                disabled={tab !== 'notifications' || (!r.unread && !r.target)}
                onPress={() => {
                  if (r.unread) markRead.mutate(r.id);
                  if (r.target?.kind === 'announcements') setTab('announcements');
                  else if (r.target) router.push(r.target.href as never);
                }}
                style={[styles.card, cardShadow, r.unread && styles.cardUnread, r.ended && { opacity: 0.6 }]}
              >
                {r.unread ? <View style={styles.unreadBar} /> : null}
                <View style={[styles.iconTile, r.unread ? { backgroundColor: r.tone === 'primary' ? colors.deep : tone.fg } : { backgroundColor: tone.bg }]}>
                  <MaterialIcons name={r.icon} size={21} color={r.unread ? '#FFFFFF' : tone.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <View style={styles.topRow}>
                    <Text style={[styles.title, !r.unread && styles.titleRead]} numberOfLines={2}>{r.title}</Text>
                    <Text style={styles.time}>{r.date ? fmt(r.date) : ''}</Text>
                  </View>
                  <Text style={styles.body}>{r.body}</Text>
                  {r.ended ? <Text style={styles.ended}>{t('common.notif_ended')}</Text> : null}
                </View>
                {r.target ? <MaterialIcons name="chevron-right" size={20} color={colors.muted} style={styles.chevron} /> : null}
              </Pressable>
            );
            // Seules les notifications reçues se suppriment (balayage vers la gauche) ; les annonces restent consultables.
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

      <BottomSheet visible={confirmAll} onClose={() => setConfirmAll(false)}>
        <View style={styles.confirmIcon}>
          <MaterialIcons name="delete-outline" size={30} color={colors.dangerInk} />
        </View>
        <Text style={styles.confirmTitle}>{t('member.delete_all_title')}</Text>
        <Text style={styles.confirmText}>{t('member.delete_all_text')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button label={t('member.delete_all_confirm')} variant="danger" loading={deleteAll.isPending} onPress={() => deleteAll.mutate(undefined, { onSettled: () => setConfirmAll(false) })} />
          <Button label={t('common.annuler')} variant="outline" onPress={() => setConfirmAll(false)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    tabsWrap: { paddingHorizontal: spacing.lg, paddingBottom: 10 },
    tabs: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: radii.full, backgroundColor: colors.surface2, position: 'relative' },
    thumb: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: radii.full, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    tab: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
    tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted, flexShrink: 1 },
    tabTextOn: { color: colors.text },
    tabBadge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.deep },
    tabBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#FFFFFF' },
    container: { padding: spacing.lg, paddingTop: 6, gap: 14, paddingBottom: 80 },
    groupHeader: { marginTop: 6 },
    actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    actionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.primarySoft },
    actionPillDanger: { backgroundColor: colors.dangerSoft },
    actionPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    confirmIcon: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft, marginBottom: 14 },
    confirmTitle: { fontFamily: fonts.headBold, fontSize: 19, letterSpacing: -0.3, color: colors.text, textAlign: 'center' },
    confirmText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, lineHeight: 20, textAlign: 'center', marginTop: 6 },
    deleteAction: { width: 96, marginStart: 8, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.danger },
    deleteText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#fff' },
    card: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    cardUnread: { borderColor: colors.primaryBorder },
    unreadBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.deep },
    chevron: { alignSelf: 'center', marginEnd: -4 },
    iconTile: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    time: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.muted, marginTop: 2 },
    ended: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.muted },
    title: { flex: 1, fontFamily: fonts.headBold, fontSize: 15, letterSpacing: -0.2, color: colors.text },
    titleRead: { fontFamily: fonts.bodyBold, color: colors.text },
    body: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
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
