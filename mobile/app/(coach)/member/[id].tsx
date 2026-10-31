import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachMember, type CoachMemberView } from '../../../src/hooks/useCoachSessions';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { useNow } from '../../../src/hooks/useNow';
import { Avatar, DetailSkeleton, EmptyState } from '../../../src/components/ui';
import { StatusTag } from '../../../src/components/staff/staffUi';
import { Pagination } from '../../../src/components/ui/Pagination';
import { dateLocale } from '../../../src/i18n';

type Course = CoachMemberView['courses'][number];

/** Cours affichés par page, pour les cours à venir comme pour les cours passés. */
const PAGE_SIZE = 3;

/**
 * Profil d'un adhérent vu par un coach — volontairement limité : nom, type d'abonnement et cours auxquels il est
 * inscrit avec ce coach. Aucune coordonnée, aucun paiement, aucun historique.
 */
export default function CoachMemberScreen() {
  const { t } = useTranslation();
  const nowMs = useNow();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: member, isLoading, isError, refetch } = useCoachMember(id);
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [pastPage, setPastPage] = useState(0);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }
  if (isError || !member) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="" fallbackHref="/(coach)/(tabs)/planning" />
        <View style={{ padding: spacing.lg }}>
          <EmptyState icon="person-off" title={t('staff.adherent_introuvable')} text={t('coach.member_not_found')} tone="muted" />
        </View>
      </SafeAreaView>
    );
  }

  const upcoming = member.courses.filter((c) => new Date(c.endsAt).getTime() >= nowMs).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = member.courses.filter((c) => new Date(c.endsAt).getTime() < nowMs).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const initials = `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
  const upcomingPages = Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE));
  const pastPages = Math.max(1, Math.ceil(past.length / PAGE_SIZE));
  const upcomingCurrent = Math.min(upcomingPage, upcomingPages - 1);
  const pastCurrent = Math.min(pastPage, pastPages - 1);

  const statusTag = (c: Course) => {
    switch (c.status) {
      case 'ATTENDED':
        return <StatusTag label={t('common.present')} tone="success" />;
      case 'NO_SHOW':
        return <StatusTag label={t('coach.member_status_no_show')} tone="danger" />;
      case 'WAITLISTED':
        return <StatusTag label={c.waitlistPosition ? t('common.liste_dattente_e', { waitlistPosition: c.waitlistPosition }) : t('common.liste_dattente')} tone="warning" />;
      default:
        return <StatusTag label={t('coach.member_status_confirmed')} tone="muted" />;
    }
  };

  const courseCard = (c: Course) => {
    const start = new Date(c.startsAt);
    const end = new Date(c.endsAt);
    const hour = (d: Date) => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
    return (
      <Pressable
        key={c.bookingId}
        onPress={() => router.push({ pathname: '/(coach)/session/[id]', params: { id: c.sessionId } } as never)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.course, cardShadow, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{start.toLocaleDateString(dateLocale(), { day: 'numeric' })}</Text>
          <Text style={styles.dateMonth}>{start.toLocaleDateString(dateLocale(), { month: 'short' })}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={styles.courseName} numberOfLines={1}>{c.className}</Text>
          <Text style={styles.courseMeta} numberOfLines={1}>
            {start.toLocaleDateString(dateLocale(), { weekday: 'long' })} · {hour(start)} – {hour(end)}{c.room ? ` · ${c.room}` : ''}
          </Text>
        </View>
        {statusTag(c)}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="" fallbackHref="/(coach)/(tabs)/planning" />
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.identity}>
          <Avatar initials={initials} size={96} background={colors.primarySoft} color={colors.primaryInk} photoUrl={member.photoUrl} />
          <Text style={styles.name}>{member.firstName} {member.lastName}</Text>
          <View style={styles.planPill}>
            <MaterialIcons name="card-membership" size={16} color={member.subscription ? colors.primaryInk : colors.muted} />
            <Text style={[styles.planText, !member.subscription && { color: colors.muted }]}>{member.subscription ?? t('staff.sans_abonnement')}</Text>
          </View>
        </View>

        {upcoming.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.section}>{t('coach.member_upcoming')} · {upcoming.length}</Text>
            {upcoming.slice(upcomingCurrent * PAGE_SIZE, (upcomingCurrent + 1) * PAGE_SIZE).map(courseCard)}
            <Pagination page={upcomingCurrent} pageCount={upcomingPages} pageSize={PAGE_SIZE} total={upcoming.length} onChange={setUpcomingPage} unit={t('coach.member_courses_unit')} />
          </View>
        ) : null}

        {past.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.section}>{t('coach.member_past')} · {past.length}</Text>
            {past.slice(pastCurrent * PAGE_SIZE, (pastCurrent + 1) * PAGE_SIZE).map(courseCard)}
            <Pagination page={pastCurrent} pageCount={pastPages} pageSize={PAGE_SIZE} total={past.length} onChange={setPastPage} unit={t('coach.member_courses_unit')} />
          </View>
        ) : null}

        <Text style={styles.note}>{t('coach.member_scope_hint')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, paddingBottom: 60, gap: spacing.lg },
    identity: { alignItems: 'center', gap: 10, paddingTop: 4 },
    name: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -1, color: colors.text, textAlign: 'center' },
    planPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 14, borderRadius: 16,
      backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder,
    },
    planText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.primaryInk },
    section: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text },
    course: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.lg,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    dateBlock: { width: 48, height: 52, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    dateDay: { fontFamily: fonts.head, fontSize: 19, color: colors.primaryInk, lineHeight: 22 },
    dateMonth: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primaryInk, textTransform: 'uppercase' },
    courseName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    courseMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textTransform: 'capitalize' },
    note: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.muted, textAlign: 'center' },
  });
}
