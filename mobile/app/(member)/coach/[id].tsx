import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachAvailability, useCoachProfile, useRequestCoachingSession } from '../../../src/hooks/useMemberCoaching';
import { Avatar, Banner, BottomSheet, EmptyState, Pill } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import { ApiError } from '../../../src/api/client';

const DAY_LABELS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function buildWeekDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

/** Fiche coach & disponibilités — FitZone App Entraînement.dc.html, G2/G3.
 * Sélecteur de jour + grille de créneaux horaires cliquables, puis confirmation. */
export default function CoachDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: coach, isLoading } = useCoachProfile(id);
  const { data: availability } = useCoachAvailability();
  const requestSession = useRequestCoachingSession();

  const weekDays = useMemo(buildWeekDays, []);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [objective, setObjective] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedDate = weekDays[selectedDayIndex];
  const dayOfWeek = selectedDate.getDay();

  const slotsForDay = useMemo(
    () =>
      (availability ?? [])
        .filter((a) => a.coachId === id && a.dayOfWeek === dayOfWeek && a.startTime)
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    [availability, id, dayOfWeek],
  );

  const daysWithAvailability = useMemo(
    () => new Set((availability ?? []).filter((a) => a.coachId === id).map((a) => a.dayOfWeek)),
    [availability, id],
  );

  if (isLoading || !coach) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const selectedSlot = slotsForDay.find((s) => s.startTime === selectedTime);

  const handleConfirm = () => {
    if (!selectedSlot) return;
    setError(null);
    const [startH, startM] = selectedSlot.startTime!.split(':').map(Number);
    const [endH, endM] = (selectedSlot.endTime ?? selectedSlot.startTime!).split(':').map(Number);
    const startsAt = new Date(selectedDate);
    startsAt.setHours(startH, startM, 0, 0);
    const endsAt = new Date(selectedDate);
    endsAt.setHours(endH, endM, 0, 0);

    requestSession.mutate(
      {
        coachId: id!,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        objective: objective.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowConfirm(false);
          setSuccess(true);
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : 'Erreur lors de la demande'),
      },
    );
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={{ fontSize: 40 }}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Demande envoyée</Text>
          <Text style={styles.successText}>{coach.user.firstName} confirmera votre séance prochainement.</Text>
          <Button label="Retour" onPress={() => router.replace('/(member)/coaching')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="" fallbackHref="/(member)/coaching" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.identityRow}>
          <Avatar initials={`${coach.user.firstName[0] ?? ''}${coach.user.lastName[0] ?? ''}`.toUpperCase()} size={80} background={colors.accent} color={colors.onAccent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{coach.user.firstName}</Text>
            {coach.rating ? (
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={16} color={colors.accentInk} />
                <Text style={styles.ratingText}>
                  {Number(coach.rating).toFixed(1).replace('.', ',')} · {coach.reviewCount} avis
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {coach.specialties.length ? (
          <View style={styles.specialtiesRow}>
            {coach.specialties.map((s) => (
              <Pill key={s} label={s} tone="accent" />
            ))}
          </View>
        ) : null}

        {coach.bio ? <Text style={styles.bio}>{coach.bio}</Text> : null}

        <View style={styles.factsGrid}>
          <FactTile value={coach.yearsExperience ? `${coach.yearsExperience} ans` : '—'} label="expérience" />
          <FactTile value="60 min" label="séance" />
        </View>

        <Text style={styles.sectionTitle}>Disponibilités</Text>

        <View style={styles.dayRow}>
          {weekDays.map((d, i) => {
            const hasSlots = daysWithAvailability.has(d.getDay());
            const active = i === selectedDayIndex;
            return (
              <Pressable
                key={d.toISOString()}
                style={[styles.dayCell, active && styles.dayCellActive]}
                onPress={() => { setSelectedDayIndex(i); setSelectedTime(null); }}
              >
                <Text style={[styles.dayLabel, active && styles.dayTextActive]}>{DAY_LABELS_SHORT[d.getDay()]}</Text>
                <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{d.getDate()}</Text>
                <View style={[styles.dayDot, hasSlots && (active ? styles.dayDotActiveOnDark : styles.dayDotVisible)]} />
              </Pressable>
            );
          })}
        </View>

        {slotsForDay.length === 0 ? (
          <EmptyState
            icon="event-busy"
            title={`Aucun créneau ${DAY_LABELS_SHORT[dayOfWeek].toLowerCase()}`}
            text="Choisissez un autre jour dans le calendrier ci-dessus."
            tone="muted"
          />
        ) : (
          <View style={styles.slotsGrid}>
            {slotsForDay.map((slot) => {
              const active = selectedTime === slot.startTime;
              return (
                <Pressable
                  key={slot.id}
                  style={[styles.slotChip, active && styles.slotChipActive]}
                  onPress={() => setSelectedTime(slot.startTime)}
                >
                  <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>{slot.startTime}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerLabel}>
            {selectedSlot ? `${DAY_LABELS_SHORT[dayOfWeek]} ${selectedDate.getDate()} · ${selectedSlot.startTime}` : 'Choisissez un créneau'}
          </Text>
          {coach.sessionPrice ? (
            <Text style={styles.footerPrice}>{coach.sessionPrice} DT à l’accueil</Text>
          ) : null}
        </View>
        <Button label="Réserver" onPress={() => setShowConfirm(true)} disabled={!selectedSlot} />
      </View>

      <BottomSheet visible={showConfirm} onClose={() => setShowConfirm(false)}>
        <Text style={styles.sheetTitle}>Confirmer la séance</Text>

        <View style={styles.recapCard}>
          <RecapRow label="Coach" value={coach.user.firstName} />
          <RecapRow
            label="Date"
            value={selectedSlot ? `${selectedDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${selectedSlot.startTime}` : '—'}
          />
          {coach.sessionPrice ? <RecapRow label="Tarif" value={`${coach.sessionPrice} DT à l’accueil`} /> : null}
        </View>

        <Text style={styles.fieldLabel}>Objectif de la séance (facultatif)</Text>
        <TextInput
          value={objective}
          onChangeText={setObjective}
          placeholder="Ex. technique du squat"
          placeholderTextColor={colors.muted}
          style={styles.objectiveInput}
          multiline
        />

        <Text style={styles.legalText}>
          Annulation gratuite jusqu’à 24 h avant la séance. Au-delà, contactez votre coach directement.
        </Text>

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <Button label={requestSession.isPending ? 'Envoi…' : 'Confirmer la séance'} onPress={handleConfirm} loading={requestSession.isPending} />
      </BottomSheet>
    </SafeAreaView>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.recapRow}>
      <Text style={styles.recapLabel}>{label}</Text>
      <Text style={styles.recapValue}>{value}</Text>
    </View>
  );
}

function FactTile({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.factTile}>
      <Text style={styles.factValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 140 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontFamily: fonts.head, fontSize: 24, color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentInk },
  specialtiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bio: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 20, marginTop: spacing.sm },
  factsGrid: { flexDirection: 'row', gap: 8, marginTop: 2 },
  factTile: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
    padding: 10, alignItems: 'center',
  },
  factValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  factLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
  sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text, marginTop: spacing.md },
  dayRow: { flexDirection: 'row', gap: 4 },
  dayCell: { flex: 1, height: 64, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayCellActive: { backgroundColor: colors.secondary },
  dayLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.muted },
  dayNumber: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
  dayTextActive: { color: colors.onSecondary },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dayDotVisible: { backgroundColor: colors.primary },
  dayDotActiveOnDark: { backgroundColor: colors.onSecondary },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    width: '31%', height: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  slotChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotChipText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.text },
  slotChipTextActive: { color: colors.primaryContrast },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm,
  },
  footerLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted },
  footerPrice: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text, marginTop: 2 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  successIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.successSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontFamily: fonts.head, fontSize: 24, color: colors.text },
  successText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 19, color: colors.text, marginBottom: spacing.sm },
  recapCard: {
    backgroundColor: colors.surface2, borderRadius: radii.sm, padding: spacing.sm, gap: 8, marginBottom: spacing.md,
  },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between' },
  recapLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  recapValue: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginBottom: 6 },
  objectiveInput: {
    minHeight: 48, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: colors.text,
    backgroundColor: colors.surface, marginBottom: spacing.sm, textAlignVertical: 'top',
  },
  legalText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted, marginBottom: spacing.md },
  });
}
