import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe } from '../../../src/hooks/useMe';
import { useCreateBooking, useSessions } from '../../../src/hooks/useClasses';
import { useBranches } from '../../../src/hooks/useBranches';
import { useUpdateProfile } from '../../../src/hooks/useProfile';
import type { ClassSessionSummary } from '../../../src/api/types';
import { ApiError } from '../../../src/api/client';
import { Banner, BottomSheet, Chip, EmptyState, SkeletonBlock, SkeletonGroup } from '../../../src/components/ui';
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
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user, isLoading: userLoading } = useMe();
  const branchId = user?.homeBranchId ?? undefined;
  const { data: sessions, isLoading, isError, refetch } = useSessions(branchId);
  const { data: branches } = useBranches();
  const updateProfile = useUpdateProfile();
  const [branchSheetOpen, setBranchSheetOpen] = useState(false);
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
      onError: (e) => setBookingError(e instanceof ApiError ? e.message : 'Erreur de réservation'),
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

  if (!userLoading && user && !user.homeBranchId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Planning</Text>
        </View>
        <EmptyState
          icon="location-off"
          title="Aucune salle sélectionnée"
          text="Choisissez votre salle habituelle pour voir les cours disponibles."
          tone="primary"
          actionLabel="Choisir ma salle"
          onAction={() => setBranchSheetOpen(true)}
        />
        <BottomSheet visible={branchSheetOpen} onClose={() => setBranchSheetOpen(false)}>
          <Text style={styles.sheetTitle}>Choisir une salle</Text>
          <View style={styles.optionsWrap}>
            {branches?.map((b) => (
              <Pressable
                key={b.id}
                style={styles.optionRow}
                onPress={() => {
                  updateProfile.mutate({ homeBranchId: b.id }, { onSuccess: () => setBranchSheetOpen(false) });
                }}
              >
                <Text style={styles.optionText}>{b.name}</Text>
              </Pressable>
            ))}
          </View>
        </BottomSheet>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Planning</Text>
        <Pressable onPress={() => router.push('/(member)/reservations')}>
          <Text style={styles.myBookingsLink}>Mes réservations</Text>
        </Pressable>
      </View>

      <View style={styles.sticky}>
        <DaySelector days={days} selectedIndex={selectedDay} onSelect={setSelectedDay} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Chip
            label={activeFilterCount > 0 ? `Filtres (${activeFilterCount})` : 'Filtres'}
            icon="tune"
            active={activeFilterCount > 0}
            onPress={() => {
              setClassTypeFilter(null);
              setCoachFilter(null);
            }}
          />
          <Chip
            label={classTypeFilter ?? 'Type de cours'}
            trailingIcon="expand-more"
            active={!!classTypeFilter}
            onPress={() => setOpenSheet('classType')}
          />
          <Chip
            label={coachFilter ?? 'Coach'}
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
          title="Planning indisponible"
          text="Impossible de charger les cours. Vérifiez votre connexion."
          tone="danger"
          actionLabel="Réessayer"
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={daySessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
              title="Aucun cours ce jour-là"
              text="Essayez un autre jour ou retirez un filtre."
              tone="primary"
            />
          }
        />
      )}

      <BottomSheet visible={openSheet === 'classType'} onClose={() => setOpenSheet(null)}>
        <Text style={styles.sheetTitle}>Type de cours</Text>
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
        <Button label="Fermer" variant="ghost" onPress={() => setOpenSheet(null)} />
      </BottomSheet>

      <BottomSheet visible={openSheet === 'coach'} onClose={() => setOpenSheet(null)}>
        <Text style={styles.sheetTitle}>Coach</Text>
        <View style={styles.optionsWrap}>
          {coachOptions.length === 0 ? (
            <Text style={styles.emptyOptionsText}>Aucun coach sur les cours affichés.</Text>
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
        <Button label="Fermer" variant="ghost" onPress={() => setOpenSheet(null)} />
      </BottomSheet>
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
      spotsLabel={isFull ? 'Complet · liste d’attente' : `${spotsLeft} places`}
      statusTone={isFull ? 'danger' : spotsLeft <= 3 ? 'warning' : 'success'}
      progress={progress}
      ctaLabel={booking ? '...' : isFull ? 'Liste d’attente' : 'Réserver'}
      onPress={onPress}
      onPressCta={onBook}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
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
