import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe } from '../../../src/hooks/useMe';
import {
  useCoachCoachingSessions,
  useCoachPendingSessions,
  useCoachSessions,
  useConfirmCoachingSession,
  useDeclineCoachingSession,
} from '../../../src/hooks/useCoachSessions';
import { useConversations } from '../../../src/hooks/useSocial';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { Avatar, EmptyState, OfflineBanner, SkeletonBlock } from '../../../src/components/ui';
import { CoachStatCard } from '../../../src/components/coach/CoachStatCard';
import { DayScheduleRow } from '../../../src/components/coach/DayScheduleRow';

/** Accueil Coach — FitZone App Coach.dc.html, I1. */
export default function CoachTodayScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user, isLoading: userLoading } = useMe();
  const { data: sessions, isLoading: sessionsLoading } = useCoachSessions();
  const { data: individualSessions } = useCoachCoachingSessions();
  const { data: pendingRequests } = useCoachPendingSessions();
  const { data: conversations } = useConversations();
  const { isOnline, lastSyncAt } = useNetworkStatus();
  const confirmSession = useConfirmCoachingSession();
  const declineSession = useDeclineCoachingSession();

  const today = useMemo(() => new Date(), []);
  const dateLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const todayEvents = useMemo(() => {
    const classes = (sessions ?? [])
      .filter((s) => new Date(s.startsAt).toDateString() === today.toDateString())
      .map((s) => ({
        kind: 'class' as const,
        id: s.id,
        startsAt: s.startsAt,
        name: s.classType.name,
        meta: `${s.room?.name ?? ''} · ${s._count.bookings}/${s.capacity} inscrits`.replace(/^ · /, ''),
        isFull: s._count.bookings >= s.capacity,
        onPress: () => router.push(`/(coach)/session/${s.id}`),
      }));
    const individual = (individualSessions ?? [])
      .filter((s) => s.status !== 'CANCELLED' && new Date(s.startsAt).toDateString() === today.toDateString())
      .map((s) => ({
        kind: 'individual' as const,
        id: s.id,
        startsAt: s.startsAt,
        name: `Individuel · ${s.member.firstName} ${s.member.lastName}`,
        meta: s.status === 'PENDING' ? 'En attente de confirmation' : 'Confirmée',
        isFull: false,
        onPress: undefined,
      }));
    return [...classes, ...individual].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [sessions, individualSessions, today]);

  const now = Date.now();
  const nextEvent = todayEvents.find((e) => new Date(e.startsAt).getTime() >= now);

  const classCount = todayEvents.filter((e) => e.kind === 'class').length;
  const totalEnrolled = (sessions ?? [])
    .filter((s) => new Date(s.startsAt).toDateString() === today.toDateString())
    .reduce((sum, s) => sum + s._count.bookings, 0);

  const unreadConversations = (conversations ?? []).filter((c) => {
    const last = c.messages[0];
    return last && last.senderId !== user?.id && !last.readAt;
  });

  const countdownLabel = (startsAt: string) => {
    const diffMs = new Date(startsAt).getTime() - now;
    if (diffMs <= 0) return 'En cours';
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 60) return `dans ${minutes} min`;
    return `dans ${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
  };

  if (userLoading || sessionsLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <SkeletonBlock height={30} width="55%" radius={radii.xs} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <SkeletonBlock height={66} radius={radii.sm} />
            <SkeletonBlock height={66} radius={radii.sm} />
            <SkeletonBlock height={66} radius={radii.sm} />
          </View>
          <SkeletonBlock height={120} radius={radii.lg} />
          <SkeletonBlock height={160} radius={radii.md} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Bonjour, {user?.firstName}</Text>
            <Text style={styles.subtitle}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} · {classCount} cours</Text>
          </View>
        </View>

        {!isOnline ? <OfflineBanner lastSyncAt={lastSyncAt} /> : null}

        <View style={styles.statsRow}>
          <CoachStatCard value={String(totalEnrolled)} label="Inscrits aujourd’hui" tone="secondary" />
          <CoachStatCard value={String(pendingRequests?.length ?? 0)} label="Demandes" tone="accent" />
          <CoachStatCard value={String(unreadConversations.length)} label="Messages non lus" tone="success" />
        </View>

        {nextEvent ? (
          <Pressable style={styles.nextCard} onPress={nextEvent.onPress}>
            <View style={styles.nextHeaderRow}>
              <Text style={styles.nextLabel}>PROCHAIN · {countdownLabel(nextEvent.startsAt)}</Text>
              {nextEvent.isFull ? (
                <View style={styles.fullBadge}>
                  <Text style={styles.fullBadgeText}>Complet</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.nextName}>{nextEvent.name}</Text>
            <Text style={styles.nextMeta}>
              {new Date(nextEvent.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {nextEvent.meta}
            </Text>
            {nextEvent.kind === 'class' ? (
              <View style={styles.nextActions}>
                <Pressable style={styles.rollCallButton} onPress={nextEvent.onPress}>
                  <MaterialIcons name="how-to-reg" size={16} color={colors.primaryContrast} />
                  <Text style={styles.rollCallText}>Faire l’appel</Text>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {pendingRequests && pendingRequests.length > 0 ? (
          <View style={styles.pendingCard}>
            <View style={styles.pendingHeaderRow}>
              <MaterialIcons name="inbox" size={20} color={colors.accentInk} />
              <Text style={styles.pendingHeaderText}>
                {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} de séance individuelle
              </Text>
            </View>
            {pendingRequests.slice(0, 2).map((req) => (
              <View key={req.id} style={styles.pendingRow}>
                <Avatar initials={`${req.member.firstName[0] ?? ''}${req.member.lastName[0] ?? ''}`.toUpperCase()} background={colors.accent} color={colors.onAccent} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingName}>{req.member.firstName} {req.member.lastName}</Text>
                  <Text style={styles.pendingMeta}>
                    {new Date(req.startsAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                    {new Date(req.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.pendingActions}>
                  <Pressable
                    style={styles.declineButton}
                    onPress={() => declineSession.mutate(req.id)}
                    disabled={declineSession.isPending || confirmSession.isPending}
                  >
                    <Text style={styles.declineButtonText}>Refuser</Text>
                  </Pressable>
                  <Pressable
                    style={styles.acceptButton}
                    onPress={() => confirmSession.mutate(req.id)}
                    disabled={declineSession.isPending || confirmSession.isPending}
                  >
                    <Text style={styles.acceptButtonText}>Accepter</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Ma journée</Text>
        {todayEvents.length === 0 ? (
          <EmptyState icon="beach-access" title="Journée de repos" text="Aucun cours ni séance aujourd'hui." tone="success" />
        ) : (
          <View style={styles.dayList}>
            {todayEvents.map((event) => (
              <DayScheduleRow
                key={event.id}
                time={new Date(event.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                name={event.name}
                meta={event.meta}
                statusLabel={
                  new Date(event.startsAt).getTime() < now
                    ? 'Terminé'
                    : event.id === nextEvent?.id
                      ? countdownLabel(event.startsAt)
                      : 'À venir'
                }
                statusTone={new Date(event.startsAt).getTime() < now ? 'muted' : 'primary'}
                isPast={new Date(event.startsAt).getTime() < now}
                onPress={event.onPress}
              />
            ))}
          </View>
        )}

        {unreadConversations.length > 0 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Messages non lus · {unreadConversations.length}</Text>
            </View>
            <View style={styles.dayList}>
              {unreadConversations.slice(0, 3).map((c) => {
                const other = c.participants.find((p) => p.user.id !== user?.id)?.user;
                const last = c.messages[0];
                return (
                  <Pressable key={c.id} style={styles.messageRow} onPress={() => router.push(`/(coach)/conversation/${c.id}`)}>
                    <Avatar initials={`${other?.firstName[0] ?? ''}${other?.lastName[0] ?? ''}`.toUpperCase()} size={40} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.messageHeaderRow}>
                        <Text style={styles.messageName}>{other?.firstName} {other?.lastName}</Text>
                        <Text style={styles.messageTime}>
                          {last ? new Date(last.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                      <Text style={styles.messagePreview} numberOfLines={1}>{last?.body}</Text>
                    </View>
                    <View style={styles.unreadDot} />
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: fonts.head, fontSize: 26, color: colors.text },
    subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: spacing.sm },
    nextCard: { backgroundColor: colors.secondary, borderRadius: radii.lg, padding: spacing.md, gap: 8 },
    nextHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nextLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.5, color: colors.onSecondary, opacity: 0.85 },
    fullBadge: { backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    fullBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10.5, color: colors.primaryContrast },
    nextName: { fontFamily: fonts.headSemiBold, fontSize: 19, color: colors.onSecondary },
    nextMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.onSecondary, opacity: 0.85 },
    nextActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    rollCallButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary,
      height: 40, paddingHorizontal: 14, borderRadius: radii.sm,
    },
    rollCallText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryContrast },
    pendingCard: {
      backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.accentBorder,
      borderRadius: radii.md, padding: 14, gap: 10,
    },
    pendingHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pendingHeaderText: {
      fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.accentInk,
    },
    pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pendingName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    pendingMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    pendingActions: { flexDirection: 'column', gap: 6 },
    declineButton: {
      height: 34, paddingHorizontal: 12, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.danger,
      alignItems: 'center', justifyContent: 'center',
    },
    declineButtonText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.dangerInk },
    acceptButton: {
      height: 34, paddingHorizontal: 12, borderRadius: radii.sm, backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    acceptButtonText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryContrast },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    dayList: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
    messageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    messageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
    messageName: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.text },
    messageTime: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
    messagePreview: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  });
}
