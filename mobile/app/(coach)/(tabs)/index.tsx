import { useMemo } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe } from '../../../src/hooks/useMe';
import { useCoachPrograms, useCoachSessions } from '../../../src/hooks/useCoachSessions';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { OfflineBanner, SkeletonBlock } from '../../../src/components/ui';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { NotificationBell } from '../../../src/components/NotificationBell';
import { RoleAnnouncements, RoleNotices } from '../../../src/components/adherent/Notices';
import { dateLocale } from '../../../src/i18n';
import { useNow } from '../../../src/hooks/useNow';

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

/** Accueil Coach — Design System/FitZone Mobile Coach.dc.html (vue Accueil) : prochain cours, chiffres du jour, à traiter, cours du jour. */
export default function CoachHomeScreen() {
  const nowMs = useNow();
  const client = useQueryClient();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => client.invalidateQueries());
  const { t } = useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user, isLoading: userLoading } = useMe();
  const { data: sessions, isLoading: sessionsLoading } = useCoachSessions();
  const { data: programs } = useCoachPrograms();
  const { isOnline, lastSyncAt } = useNetworkStatus();

  const now = new Date();
  const dateLabel = now.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'C';

  const today = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => new Date(s.startsAt).toDateString() === new Date().toDateString())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [sessions],
  );
  const next = today.find((s) => new Date(s.endsAt).getTime() > nowMs);
  const totalEnrolled = today.reduce((n, s) => n + s._count.bookings, 0);
  const totalPresent = today.reduce((n, s) => n + (s.attendedCount ?? 0), 0);
  // Cours terminés ou en cours dont le pointage n'est pas complet.
  const toValidate = today.filter((s) => new Date(s.startsAt).getTime() <= nowMs && (s.attendedCount ?? 0) < s._count.bookings).length;
  const pending = (programs ?? []).filter((p) => p.status === 'PENDING').length;
  const rejected = (programs ?? []).filter((p) => p.status === 'REJECTED').length;

  const todo = [
    toValidate > 0 && { icon: 'how-to-reg' as const, tone: 'primary' as const, title: t('coach.home_todo_pointage'), meta: t('coach.home_todo_pointage_m', { count: toValidate }), onPress: () => router.push('/(coach)/(tabs)/planning') },
    pending > 0 && { icon: 'hourglass-top' as const, tone: 'warning' as const, title: t('coach.home_todo_pending', { count: pending }), meta: t('coach.home_todo_pending_m'), onPress: () => router.push('/(coach)/(tabs)/programs') },
    rejected > 0 && { icon: 'feedback' as const, tone: 'danger' as const, title: t('coach.home_todo_rejected', { count: rejected }), meta: t('coach.home_todo_rejected_m'), onPress: () => router.push('/(coach)/(tabs)/programs') },
  ].filter(Boolean) as { icon: keyof typeof MaterialIcons.glyphMap; tone: 'primary' | 'warning' | 'danger'; title: string; meta: string; onPress: () => void }[];
  const tones = {
    primary: { bg: colors.primarySoft, fg: colors.primaryInk },
    warning: { bg: colors.warningSoft, fg: colors.warningInk },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  } as const;

  if (userLoading || sessionsLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <SkeletonBlock height={56} width="60%" radius={radii.xs} />
          <SkeletonBlock height={200} radius={30} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SkeletonBlock height={74} radius={24} />
            <SkeletonBlock height={74} radius={24} />
            <SkeletonBlock height={74} radius={24} />
          </View>
          <SkeletonBlock height={140} radius={24} />
        </View>
      </SafeAreaView>
    );
  }

  const nextRatio = next && next._count.bookings ? Math.min(1, (next.attendedCount ?? 0) / next._count.bookings) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</Text>
            <Text style={styles.hello} numberOfLines={2}>{t('coach.bonjour', { firstName: user?.firstName })}</Text>
          </View>
          <NotificationBell onPress={() => router.push('/(coach)/notifications')} />
          <Pressable onPress={() => router.push('/(coach)/(tabs)/profile')} accessibilityLabel={t('common.profil')} style={styles.avatarShadow}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={[styles.avatar, { backgroundColor: colors.surface2 }]} />
            ) : (
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>

        {!isOnline ? <OfflineBanner lastSyncAt={lastSyncAt} /> : null}
        <RoleNotices />

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            {next ? (
              <>
                <Text style={styles.heroKicker}>{t('coach.home_next_label', { time: fmtTime(next.startsAt) })}</Text>
                <Text style={styles.heroName} numberOfLines={1}>{next.classType.name}</Text>
                <Text style={styles.heroMeta}>
                  {t('coach.home_places', { room: next.room?.name ?? '—', enrolled: next._count.bookings, cap: next.capacity })}
                </Text>
                <View style={styles.heroTrack}>
                  <View style={[styles.heroFill, { width: `${Math.round(nextRatio * 100)}%` }]} />
                </View>
                <Pressable style={({ pressed }) => [styles.heroBtn, pressed && { transform: [{ scale: 0.97 }] }]} onPress={() => router.push('/(coach)/(tabs)/scanner')}>
                  <MaterialIcons name="qr-code-scanner" size={24} color="#4C1D95" />
                  <Text style={styles.heroBtnText}>{t('coach.home_scan')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.heroKicker}>{t('coach.home_next_none_kicker')}</Text>
                <Text style={styles.heroName}>{t('coach.home_next_none')}</Text>
                <Text style={styles.heroMeta}>{t('coach.home_next_none_sub')}</Text>
              </>
            )}
          </LinearGradient>
        </View>

        <View style={styles.tiles}>
          <View style={[styles.tile, cardShadow]}>
            <Text style={styles.tileValue}>{today.length}</Text>
            <Text style={styles.tileLabel}>{t('coach.home_tile_courses')}</Text>
          </View>
          <View style={[styles.tile, cardShadow]}>
            <Text style={styles.tileValue}>{totalEnrolled}</Text>
            <Text style={styles.tileLabel}>{t('coach.home_tile_enrolled')}</Text>
          </View>
          <View style={[styles.tile, cardShadow]}>
            <Text style={[styles.tileValue, { color: colors.primaryInk }]}>{totalPresent}/{totalEnrolled}</Text>
            <Text style={styles.tileLabel}>{t('coach.home_tile_present')}</Text>
          </View>
        </View>

        <Text style={styles.section}>{t('coach.home_todo')}</Text>
        <View style={[styles.card, cardShadow]}>
          {todo.length === 0 ? (
            <View style={styles.todoEmpty}>
              <MaterialIcons name="task-alt" size={28} color={colors.successInk} />
              <Text style={styles.todoEmptyText}>{t('coach.home_todo_empty')}</Text>
            </View>
          ) : (
            todo.map((a) => (
              <Pressable key={a.title} onPress={a.onPress} style={({ pressed }) => [styles.todoRow, pressed && { opacity: 0.7 }]}>
                <View style={[styles.todoIcon, { backgroundColor: tones[a.tone].bg }]}>
                  <MaterialIcons name={a.icon} size={22} color={tones[a.tone].fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.todoTitle}>{a.title}</Text>
                  <Text style={styles.todoMeta}>{a.meta}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.section, { marginTop: 0 }]}>{t('coach.home_today')}</Text>
          <Pressable onPress={() => router.push('/(coach)/(tabs)/planning')} hitSlop={8}>
            <Text style={styles.link}>{t('coach.home_planning')}</Text>
          </Pressable>
        </View>
        <View style={[styles.card, cardShadow, { padding: 6 }]}>
          {today.length === 0 ? (
            <View style={styles.todoEmpty}>
              <MaterialIcons name="beach-access" size={28} color={colors.successInk} />
              <Text style={styles.todoEmptyText}>{t('coach.aucun_cours_ni_seance_aujourdhui')}</Text>
            </View>
          ) : (
            today.map((s) => {
              const isNext = s.id === next?.id;
              const enrolled = s._count.bookings;
              const present = s.attendedCount ?? 0;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/(coach)/session/${s.id}`)}
                  style={({ pressed }) => [styles.courseRow, isNext && { backgroundColor: colors.primarySoft }, pressed && { transform: [{ scale: 0.98 }] }]}
                >
                  <Text style={[styles.courseTime, { color: isNext ? colors.primaryInk : colors.text }]} numberOfLines={1}>{fmtTime(s.startsAt)}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.courseName} numberOfLines={1}>{s.classType.name}</Text>
                    <Text style={styles.courseMeta} numberOfLines={1}>{t('coach.home_course_meta', { room: s.room?.name ?? '—', count: enrolled })}</Text>
                    <View style={styles.courseTrack}>
                      <LinearGradient colors={[colors.primaryPressed, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', borderRadius: 3, width: `${Math.round((enrolled ? present / enrolled : 0) * 100)}%` }} />
                    </View>
                  </View>
                  <Text style={styles.courseRatio}>{present}/{enrolled}</Text>
                </Pressable>
              );
            })
          )}
        </View>

        <RoleAnnouncements />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: 12, paddingBottom: 120 },
    header: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 20, paddingBottom: 6 },
    date: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted },
    hello: { fontFamily: fonts.head, fontSize: 28, lineHeight: 34, letterSpacing: -1, color: colors.text, marginTop: 4 },
    avatarShadow: { shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
    avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: fonts.head, fontSize: 17, color: colors.primaryContrast },
    heroShadow: { borderRadius: 30, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
    hero: { borderRadius: 30, padding: 22, overflow: 'hidden' },
    heroDecor: { position: 'absolute', end: -50, top: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.92)' },
    heroName: { fontFamily: fonts.head, fontSize: 38, lineHeight: 42, letterSpacing: -1.6, color: '#fff', marginTop: 6 },
    heroMeta: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 4 },
    heroTrack: { marginTop: 14, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
    heroFill: { height: '100%', borderRadius: 3, backgroundColor: '#fff' },
    heroBtn: { marginTop: 18, minHeight: 52, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    heroBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#4C1D95' },
    tiles: { flexDirection: 'row', gap: 10 },
    tile: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    tileValue: { fontFamily: fonts.head, fontSize: 26, letterSpacing: -1, color: colors.text },
    tileLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginTop: 2 },
    section: { fontFamily: fonts.head, fontSize: 19, letterSpacing: -0.4, color: colors.text, marginTop: 14 },
    sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14 },
    link: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    card: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 6, paddingVertical: 4 },
    todoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 10, paddingVertical: 8 },
    todoIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    todoTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    todoMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    todoEmpty: { padding: 18, alignItems: 'center', gap: 6 },
    todoEmptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
    courseRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
    courseTime: { width: 54, fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.5 },
    courseName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    courseMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
    courseTrack: { height: 5, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 8, overflow: 'hidden' },
    courseRatio: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
  });
}
