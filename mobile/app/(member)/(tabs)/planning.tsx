import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { useCreateBooking, useSessions } from '../../../src/hooks/useClasses';
import type { ClassSessionSummary } from '../../../src/api/types';
import { ApiError } from '../../../src/api/client';
import { Banner, BottomSheet, Chip, EmptyState, OfflineBanner, SkeletonBlock, SkeletonGroup, Toast } from '../../../src/components/ui';
import { useNetworkStatusContext } from '../../../src/hooks/NetworkStatusContext';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { CourseCard } from '../../../src/components/adherent/CourseCard';
import { DaySelector } from '../../../src/components/adherent/DaySelector';
import { Button } from '../../../src/components/Button';

const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function buildWeek() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return { label: WEEKDAY_LABELS[date.getDay()], dayNumber: String(date.getDate()), date };
  });
}

export default function PlanningScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
  const { data: sessions, isLoading, isError, refetch } = useSessions();
  const { isOnline, lastSyncAt } = useNetworkStatusContext();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);
  const createBooking = useCreateBooking();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const days = useMemo(buildWeek, []);

  const [classTypeFilter, setClassTypeFilter] = useState<string | null>(null);
  const [coachFilter, setCoachFilter] = useState<string | null>(null);
  const [openSheet, setOpenSheet] = useState<'classType' | 'coach' | null>(null);

  const classTypeOptions = useMemo(() => {
    const names = new Set((sessions ?? []).map((s) => s.classType.name));
    return Array.from(names).sort();
  }, [sessions]);

  const coachOptions = useMemo(() => {
    const names = new Set(
      (sessions ?? [])
        .map((s) => s.coach?.user.firstName)
        .filter((n): n is string => !!n),
    );
    return Array.from(names).sort();
  }, [sessions]);

  const handleBook = (sessionId: string) => {
    setBookingError(null);
    createBooking.mutate(sessionId, {
      onError: (e) => setBookingError(e instanceof ApiError ? e.message : t('planning.bookingError')),
    });
  };

  const daySessions = useMemo(() => {
    if (!sessions) return [];
    const target = days[selectedDay]?.date;
    return sessions.filter((s) => {
      const d = new Date(s.startsAt);
      const matchesDay = !target || d.toDateString() === target.toDateString();
      const matchesType = !classTypeFilter || s.classType.name === classTypeFilter;
      const matchesCoach = !coachFilter || s.coach?.user.firstName === coachFilter;
      return matchesDay && matchesType && matchesCoach;
    });
  }, [sessions, days, selectedDay, classTypeFilter, coachFilter]);

  const activeFilterCount = (classTypeFilter ? 1 : 0) + (coachFilter ? 1 : 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {!isOnline ? (
        <View style={styles.bannerWrap}>
          <OfflineBanner lastSyncAt={lastSyncAt} />
        </View>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title}>{t('planning.title')}</Text>
        <Pressable onPress={() => router.push('/(member)/reservations')}>
          <Text style={styles.myBookingsLink}>{t('planning.myBookings')}</Text>
        </Pressable>
      </View>

      <View style={styles.sticky}>
        <DaySelector days={days} selectedIndex={selectedDay} onSelect={setSelectedDay} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Chip
            label={activeFilterCount > 0 ? t('planning.filtersCount', { count: activeFilterCount }) : t('planning.filters')}
            icon="tune"
            active={activeFilterCount > 0}
            onPress={() => {
              setClassTypeFilter(null);
              setCoachFilter(null);
            }}
          />
          <Chip
            label={classTypeFilter ?? t('planning.classType')}
            trailingIcon="expand-more"
            active={!!classTypeFilter}
            onPress={() => setOpenSheet('classType')}
          />
          <Chip
            label={coachFilter ?? t('planning.coach')}
            trailingIcon="expand-more"
            active={!!coachFilter}
            onPress={() => setOpenSheet('coach')}
          />
        </ScrollView>
      </View>

      {bookingError ? (
        <View style={styles.bannerWrap}>
          <Banner tone="danger" icon="error" text={bookingError} />
        </View>
      ) : null}

      {isLoading ? (
        <SkeletonGroup>
          <View style={styles.list}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} height={116} />
            ))}
          </View>
        </SkeletonGroup>
      ) : isError ? (
        <EmptyState
          icon="cloud-off"
          title={t('planning.unavailableTitle')}
          text={t('planning.unavailableText')}
          tone="danger"
          actionLabel={t('common.retry')}
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={daySessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onBook={() => handleBook(item.id)}
              onPress={() => router.push(`/(member)/session/${item.id}`)}
              booking={createBooking.isPending}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="event-busy"
              title={t('planning.emptyDayTitle')}
              text={t('planning.emptyDayText')}
              tone="primary"
            />
          }
        />
      )}

      <BottomSheet visible={openSheet === 'classType'} onClose={() => setOpenSheet(null)}>
        <Text style={styles.sheetTitle}>{t('planning.classType')}</Text>
        <View style={styles.optionsWrap}>
          {classTypeOptions.map((name) => (
            <Pressable
              key={name}
              style={[styles.optionRow, classTypeFilter === name && styles.optionRowActive]}
              onPress={() => {
                setClassTypeFilter(classTypeFilter === name ? null : name);
                setOpenSheet(null);
              }}
            >
              <Text style={[styles.optionText, classTypeFilter === name && styles.optionTextActive]}>{name}</Text>
            </Pressable>
          ))}
        </View>
        <Button label={t('common.close')} variant="ghost" onPress={() => setOpenSheet(null)} />
      </BottomSheet>

      <BottomSheet visible={openSheet === 'coach'} onClose={() => setOpenSheet(null)}>
        <Text style={styles.sheetTitle}>{t('planning.coach')}</Text>
        <View style={styles.optionsWrap}>
          {coachOptions.length === 0 ? (
            <Text style={styles.emptyOptionsText}>{t('planning.noCoachOptions')}</Text>
          ) : (
            coachOptions.map((name) => (
              <Pressable
                key={name}
                style={[styles.optionRow, coachFilter === name && styles.optionRowActive]}
                onPress={() => {
                  setCoachFilter(coachFilter === name ? null : name);
                  setOpenSheet(null);
                }}
              >
                <Text style={[styles.optionText, coachFilter === name && styles.optionTextActive]}>{name}</Text>
              </Pressable>
            ))
          )}
        </View>
        <Button label={t('common.close')} variant="ghost" onPress={() => setOpenSheet(null)} />
      </BottomSheet>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text="Pas de connexion — impossible d’actualiser" iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

function SessionCard({
  session,
  onBook,
  onPress,
  booking,
}: {
  session: ClassSessionSummary;
  onBook: () => void;
  onPress: () => void;
  booking: boolean;
}) {
  const { t } = useTranslation();
  const spotsLeft = session.capacity - session._count.bookings;
  const isFull = spotsLeft <= 0;
  const progress = session._count.bookings / Math.max(session.capacity, 1);
  const durationMinutes = Math.round(
    (new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60000,
  );

  return (
    <CourseCard
      time={new Date(session.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      duration={`${durationMinutes} min`}
      name={session.classType.name}
      meta={[session.coach?.user.firstName, session.room?.name].filter(Boolean).join(' · ') || 'Salle'}
      spotsLabel={isFull ? t('planning.full') : t('planning.spotsLeft', { count: spotsLeft })}
      statusTone={isFull ? 'danger' : spotsLeft <= 3 ? 'warning' : 'success'}
      progress={progress}
      ctaLabel={booking ? t('planning.booking') : isFull ? t('planning.waitlist') : t('planning.book')}
      onPress={onPress}
      onPressCta={onBook}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
    },
    title: { fontFamily: fonts.head, fontSize: 28, color: colors.text },
    myBookingsLink: { fontFamily: fonts.bodyBold, color: colors.primaryInk, fontSize: 13 },
    sticky: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
    filterRow: { gap: 8 },
    bannerWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    list: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: 120 },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 19, color: colors.text, marginBottom: spacing.sm },
    optionsWrap: { gap: 8, marginBottom: spacing.sm },
    optionRow: {
      height: 48, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface, justifyContent: 'center', paddingHorizontal: spacing.md,
    },
    optionRowActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    optionTextActive: { color: colors.primaryContrast },
    emptyOptionsText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  });
}
