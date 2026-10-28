import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing, typography } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe } from '../../../src/hooks/useMe';
import { useCoachSessions } from '../../../src/hooks/useCoachSessions';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { EmptyState, OfflineBanner, SkeletonBlock } from '../../../src/components/ui';
import { CoachStatCard } from '../../../src/components/coach/CoachStatCard';
import { DayScheduleRow } from '../../../src/components/coach/DayScheduleRow';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';

/** Accueil Coach — FitZone App Coach.dc.html, I1. */
export default function CoachTodayScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user, isLoading: userLoading } = useMe();
  const { data: sessions, isLoading: sessionsLoading } = useCoachSessions();
  const { isOnline, lastSyncAt } = useNetworkStatus();

  const today = useMemo(() => new Date(), []);
  const dateLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const todayEvents = useMemo(() => {
    return (sessions ?? [])
      .filter((s) => new Date(s.startsAt).toDateString() === today.toDateString())
      .map((s) => ({
        kind: 'class' as const,
        id: s.id,
        startsAt: s.startsAt,
        name: s.classType.name,
        meta: `${s.room?.name ?? ''} · ${s._count.bookings}/${s.capacity} inscrits`.replace(/^ · /, ''),
        isFull: s._count.bookings >= s.capacity,
        onPress: () => router.push(`/(coach)/session/${s.id}`),
      }))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [sessions, today]);

  const now = Date.now();
  const nextEvent = todayEvents.find((e) => new Date(e.startsAt).getTime() >= now);

  const classCount = todayEvents.length;
  const totalEnrolled = (sessions ?? [])
    .filter((s) => new Date(s.startsAt).toDateString() === today.toDateString())
    .reduce((sum, s) => sum + s._count.bookings, 0);

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
      <ScrollView {...tabBarScroll} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Bonjour, {user?.firstName}</Text>
            <Text style={styles.subtitle}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} · {classCount} cours</Text>
          </View>
        </View>

        {!isOnline ? <OfflineBanner lastSyncAt={lastSyncAt} /> : null}

        <View style={styles.statsRow}>
          <CoachStatCard value={String(totalEnrolled)} label="Inscrits aujourd’hui" tone="secondary" />
          <CoachStatCard value={String(classCount)} label="Cours" tone="accent" />
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
            <View style={styles.nextActions}>
              <Pressable style={styles.rollCallButton} onPress={nextEvent.onPress}>
                <MaterialIcons name="how-to-reg" size={16} color={colors.primaryContrast} />
                <Text style={styles.rollCallText}>Faire l’appel</Text>
              </Pressable>
            </View>
          </Pressable>
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
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...typography.largeTitle, fontSize: 28, color: colors.text },
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
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    dayList: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  });
}
