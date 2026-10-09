import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCreateBooking, useSession } from '../../../src/hooks/useClasses';
import { useMyBookings } from '../../../src/hooks/useMe';
import { Banner, ProgressBar } from '../../../src/components/ui';
import { ApiError } from '../../../src/api/client';

/** Détail d'un cours — FitZone App Adherent.dc.html, C1. */
export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: session, isLoading, refetch } = useSession(id);
  const { data: bookings } = useMyBookings();
  const createBooking = useCreateBooking();
  const [bookingError, setBookingError] = useState<string | null>(null);

  const existingBooking = bookings?.find((b) => b.sessionId === id && b.status !== 'CANCELLED');

  if (isLoading || !session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const spotsLeft = session.capacity - session._count.bookings;
  const isFull = spotsLeft <= 0;
  const progress = session._count.bookings / Math.max(session.capacity, 1);
  const durationMinutes = Math.round((new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60000);

  const handleReserve = () => {
    setBookingError(null);
    createBooking.mutate(session.id, {
      onSuccess: () => {
        if (!isFull) {
          router.replace({ pathname: '/(member)/(tabs)', params: { booked: session.classType.name } });
        } else {
          refetch();
        }
      },
      onError: (e) => setBookingError(e instanceof ApiError ? traduireErreurReservation(e) : 'Erreur de réservation'),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.heroImage}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.navigate('/(member)/(tabs)/planning'))}
          style={styles.floatingBackButton}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <View style={styles.tagsRow}>
          <Tag label="Cours collectif" tone="primary" />
        </View>
        <Text style={styles.title}>{session.classType.name}</Text>
        <Text style={styles.subtitle}>
          {new Date(session.startsAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
          {new Date(session.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} –{' '}
          {new Date(session.endsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>

        {bookingError ? <Banner tone="danger" icon="error" text={bookingError} /> : null}
        {existingBooking?.status === 'CONFIRMED' ? (
          <Banner tone="success" icon="check-circle" text="Place réservée · rappel 1 h avant" />
        ) : null}
        {existingBooking?.status === 'WAITLISTED' ? (
          <Banner
            tone="warning"
            icon="hourglass-top"
            text={`En liste d’attente · ${existingBooking.waitlistPosition ?? '?'}e position`}
          />
        ) : null}

        <View style={styles.infoGrid}>
          <InfoTile icon="sports" label="Coach" value={session.coach?.user.firstName ?? '—'} />
          <InfoTile icon="meeting-room" label="Salle" value={session.room?.name ?? '—'} />
          <InfoTile icon="timer" label="Durée" value={`${durationMinutes} min`} />
        </View>

        <View style={styles.spotsCard}>
          <View style={styles.spotsRow}>
            <Text style={styles.spotsLabel}>Places</Text>
            <Text style={[styles.spotsValue, { color: isFull ? colors.dangerInk : colors.successInk }]}>
              {isFull ? 'Complet' : `${spotsLeft} dispo.`}
            </Text>
          </View>
          <ProgressBar progress={progress} color={isFull ? colors.danger : colors.success} />
          <Text style={styles.spotsSub}>
            {session._count.bookings}/{session.capacity} inscrits
          </Text>
        </View>

        {session.classType.description ? <Text style={styles.description}>{session.classType.description}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {existingBooking?.status === 'CONFIRMED' ? (
          <Pressable style={styles.outlineDangerButton}>
            <Text style={styles.outlineDangerText}>Annuler la réservation</Text>
          </Pressable>
        ) : existingBooking?.status === 'WAITLISTED' ? (
          <Pressable style={styles.outlineDangerButton}>
            <Text style={styles.outlineDangerText}>Quitter la liste d’attente</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.primaryButton, isFull && styles.secondaryButton]}
            onPress={handleReserve}
            disabled={createBooking.isPending}
          >
            {isFull ? <MaterialIcons name="hourglass-top" size={18} color={colors.onSecondary} /> : null}
            <Text style={[styles.primaryButtonText, isFull && { color: colors.onSecondary }]}>
              {createBooking.isPending ? '...' : isFull ? 'Rejoindre la liste d’attente' : 'Réserver ma place'}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function Tag({ label, tone }: { label: string; tone: 'primary' | 'secondary' }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.tag, tone === 'primary' ? styles.tagPrimary : styles.tagSecondary]}>
      <Text style={[styles.tagText, { color: tone === 'primary' ? colors.primaryInk : colors.secondaryInk }]}>{label}</Text>
    </View>
  );
}

function InfoTile({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.infoTile}>
      <MaterialIcons name={icon} size={18} color={colors.muted} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function traduireErreurReservation(e: ApiError): string {
  switch (e.code) {
    case 'NO_MEMBERSHIP':
      return "Vous n'avez pas d'abonnement actif. Contactez l'accueil.";
    case 'MEMBERSHIP_EXPIRED':
      return 'Votre abonnement a expiré.';
    case 'MEMBERSHIP_SUSPENDED':
      return 'Votre abonnement est suspendu.';
    case 'SESSION_FULL':
      return 'Ce cours est complet.';
    default:
      return e.message;
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  heroImage: { height: 220, backgroundColor: colors.surface2 },
  floatingBackButton: {
    position: 'absolute', top: 54, left: spacing.lg, width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  panel: { flex: 1, marginTop: -24, backgroundColor: colors.bg, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  panelContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 140 },
  tagsRow: { flexDirection: 'row', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tagPrimary: { backgroundColor: colors.primarySoft },
  tagSecondary: { backgroundColor: colors.secondarySoft },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
  title: { fontFamily: fonts.head, fontSize: 26, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  infoTile: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm,
  },
  infoLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  infoValue: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  spotsCard: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 8,
  },
  spotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  spotsLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  spotsValue: { fontFamily: fonts.bodyBold, fontSize: 13 },
  spotsSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  description: { fontFamily: fonts.body, fontSize: 13.5, color: colors.text, lineHeight: 20 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
  },
  primaryButton: {
    height: 52, borderRadius: radii.sm, backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  secondaryButton: { backgroundColor: colors.secondary },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryContrast },
  outlineDangerButton: {
    height: 52, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineDangerText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.dangerInk },
  });
}
