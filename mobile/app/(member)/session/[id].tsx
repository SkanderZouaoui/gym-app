import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCancelBooking, useCreateBooking, useSession } from '../../../src/hooks/useClasses';
import { useMyBookings } from '../../../src/hooks/useMe';
import { Button } from '../../../src/components/Button';
import { Banner, BottomSheet, ProgressBar, Toast, DetailSkeleton } from '../../../src/components/ui';
import { ApiError } from '../../../src/api/client';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { BookingConfirmSheet } from '../../../src/components/adherent/BookingConfirmSheet';
import { ImageGallery } from '../../../src/components/adherent/ImageGallery';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../../src/i18n';
import { levelLabel } from '../../../src/i18n/labels';
import { useNow } from '../../../src/hooks/useNow';

/** Détail d'un cours — FitZone App Adherent.dc.html, C1. */
export default function SessionDetailScreen() {
  const nowMs = useNow();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: session, isLoading, refetch } = useSession(id);
  const { data: bookings, refetch: refetchBookings } = useMyBookings();
  const createBooking = useCreateBooking();
  const cancelBooking = useCancelBooking();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(() =>
    Promise.all([refetch(), refetchBookings()]),
  );

  const existingBooking = bookings?.find((b) => b.sessionId === id && b.status !== 'CANCELLED');

  if (isLoading || !session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  const spotsLeft = session.capacity - session._count.bookings;
  const isFull = spotsLeft <= 0;
  const hasEnded = new Date(session.endsAt).getTime() < nowMs;
  const hasStarted = new Date(session.startsAt).getTime() <= nowMs;
  const progress = session._count.bookings / Math.max(session.capacity, 1);
  const durationMinutes = Math.round((new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60000);

  const handleReserve = () => {
    setBookingError(null);
    createBooking.mutate(session.id, {
      onSettled: () => setConfirming(false),
      onSuccess: () => {
        if (!isFull) {
          router.replace({ pathname: '/(member)/(tabs)', params: { booked: session.classType.name } });
        } else {
          refetch();
        }
      },
      onError: (e) => setBookingError(e instanceof ApiError ? traduireErreurReservation(e) : t('member.erreur_de_reservation')),
    });
  };

  const handleCancel = () => {
    if (!existingBooking) return;
    cancelBooking.mutate(existingBooking.id, {
      onSettled: () => setCancelling(false),
      onSuccess: () => { void refetch(); void refetchBookings(); },
    });
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/(member)/(tabs)/planning'));
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.planning')}</Text>
        </Pressable>

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>{t('member.cours_collectif')}</Text>
            </View>
            <Text style={styles.heroTitle}>{session.classType.name}</Text>
            <Text style={styles.heroSub}>
              {new Date(session.startsAt).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.heroTime}>
              {timeOf(session.startsAt)} – {timeOf(session.endsAt)}
            </Text>
          </LinearGradient>
        </View>

        {bookingError ? <Banner tone="danger" icon="error" text={bookingError} /> : null}
        {existingBooking?.status === 'CONFIRMED' ? (
          <Banner tone="success" icon="check-circle" text={t('member.place_reservee_rappel_1_h')} />
        ) : null}
        {existingBooking?.status === 'WAITLISTED' ? (
          <Banner
            tone="warning"
            icon="hourglass-top"
            text={t('member.en_liste_dattente_e_position', { v0: existingBooking.waitlistPosition ?? '?' })}
          />
        ) : null}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statValue}>{session.coach?.user.firstName ?? '—'}</Text>
            <Text style={styles.statLabel}>{t('common.coach')}</Text>
          </View>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statValue}>{session.room?.name ?? '—'}</Text>
            <Text style={styles.statLabel}>{t('common.salle')}</Text>
          </View>
          <View style={[styles.statCard, cardShadow]}>
            <Text style={styles.statValue}>{t('member.min_2', { durationMinutes })}</Text>
            <Text style={styles.statLabel}>{t('common.duree')}</Text>
          </View>
        </View>

        <View style={[styles.spotsCard, cardShadow]}>
          <View style={styles.spotsRow}>
            <Text style={styles.spotsLabel}>{t('member.places')}</Text>
            <View style={[styles.spotsTag, { backgroundColor: isFull ? colors.dangerSoft : spotsLeft <= 3 ? colors.warningSoft : colors.surface2 }]}>
              <Text style={[styles.spotsTagText, { color: isFull ? colors.dangerInk : spotsLeft <= 3 ? colors.warningInk : colors.muted }]}>
                {isFull ? t('common.complet') : `${spotsLeft} dispo.`}
              </Text>
            </View>
          </View>
          <ProgressBar progress={progress} color={isFull ? colors.danger : colors.primary} />
          <Text style={styles.spotsSub}>{t('member.inscrits', { bookings: session._count.bookings, capacity: session.capacity })}</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>{t('member.description_du_cours')}</Text>
          <View style={[styles.descriptionCard, cardShadow]}>
            {session.classType.description ? (
              <Text style={styles.description}>{session.classType.description}</Text>
            ) : (
              <Text style={styles.descriptionEmpty}>{t('member.aucune_description_pour_ce_cours')}</Text>
            )}
            {session.classType.level ? (
              <View style={styles.levelRow}>
                <MaterialIcons name="signal-cellular-alt" size={18} color={colors.primaryInk} />
                <Text style={styles.levelText}>{t('member.niveau', { level: levelLabel(session.classType.level) })}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {session.room?.galleryUrls && session.room.galleryUrls.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{t('common.salle')} · {session.room.name}</Text>
            <ImageGallery urls={session.room.galleryUrls} />
          </View>
        ) : null}

        {session.classType.galleryUrls && session.classType.galleryUrls.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>{t('member.galerie')}</Text>
            <ImageGallery urls={session.classType.galleryUrls} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {hasEnded ? (
          <View style={styles.closed}>
            <MaterialIcons name="event-busy" size={20} color={colors.muted} />
            <Text style={styles.closedText}>{t('member.ce_cours_est_termine')}</Text>
          </View>
        ) : existingBooking?.status === 'CONFIRMED' || existingBooking?.status === 'WAITLISTED' ? (
          <Pressable
            style={({ pressed }) => [styles.outlineDangerButton, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => setCancelling(true)}
            disabled={cancelBooking.isPending}
          >
            <MaterialIcons name="close" size={18} color={colors.dangerInk} />
            <Text style={styles.outlineDangerText}>
              {cancelBooking.isPending
                ? '...'
                : existingBooking.status === 'WAITLISTED'
                  ? t('member.quitter_la_liste_dattente')
                  : t('member.annuler_la_reservation')}
            </Text>
          </Pressable>
        ) : hasStarted ? (
          <View style={styles.closed}>
            <MaterialIcons name="event-busy" size={20} color={colors.muted} />
            <Text style={styles.closedText}>{t('member.reservation_fermee_le_cours_a')}</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            disabled={createBooking.isPending}
            style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient
              colors={isFull ? [colors.secondary, colors.secondary] : [colors.primary, colors.primaryPressed]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <MaterialIcons name={isFull ? 'hourglass-top' : 'event-available'} size={22} color={colors.primaryContrast} />
              <Text style={styles.ctaText}>
                {createBooking.isPending ? '...' : isFull ? t('member.rejoindre_la_liste_dattente') : t('member.reserver_ma_place')}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>

      <BottomSheet visible={cancelling} onClose={() => setCancelling(false)}>
        <Text style={styles.sheetTitle}>
          {existingBooking?.status === 'WAITLISTED' ? t('member.quitter_la_liste_dattente_2') : `Annuler ${session.classType.name} ?`}
        </Text>
        <Text style={styles.sheetText}>
          {existingBooking?.status === 'WAITLISTED'
            ? t('member.vous_perdrez_votre_position_dans')
            : t('member.lannulation_est_gratuite_votre_place')}
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('member.oui_annuler')} onPress={handleCancel} variant="secondary" loading={cancelBooking.isPending} />
          <Button label={t('member.garder_ma_place')} onPress={() => setCancelling(false)} variant="outline" />
        </View>
      </BottomSheet>

      <BookingConfirmSheet
        session={confirming ? session : null}
        pending={createBooking.isPending}
        onConfirm={handleReserve}
        onClose={() => setConfirming(false)}
      />

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

function traduireErreurReservation(e: ApiError): string {
  switch (e.code) {
    case 'NO_MEMBERSHIP':
      return i18n.t('member.vous_navez_pas_dabonnement_actif');
    case 'MEMBERSHIP_EXPIRED':
      return i18n.t('member.votre_abonnement_a_expire');
    case 'MEMBERSHIP_SUSPENDED':
      return i18n.t('member.votre_abonnement_est_suspendu');
    case 'SESSION_STARTED':
      return i18n.t('member.ce_cours_a_deja_commence');
    case 'SESSION_FULL':
      return i18n.t('member.ce_cours_est_complet');
    default:
      return e.message;
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    closed: {
      height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.surface2,
    },
    closedText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.muted },
    safeArea: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    heroShadow: {
      borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
    },
    hero: { borderRadius: radii.xl, padding: 22, gap: 6, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 4 },
    heroTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    heroTitle: { fontFamily: fonts.head, fontSize: 28, lineHeight: 32, letterSpacing: -1, color: '#FFFFFF' },
    heroSub: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.92)', textTransform: 'capitalize' },
    heroTime: { fontFamily: fonts.head, fontSize: 20, letterSpacing: -0.5, color: '#FFFFFF', marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1, minWidth: 0, padding: 14, gap: 4, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    statValue: { fontFamily: fonts.head, fontSize: 16, lineHeight: 21, letterSpacing: -0.3, color: colors.text },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    spotsCard: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10,
    },
    spotsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    spotsLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    spotsTag: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
    spotsTagText: { fontFamily: fonts.bodyBold, fontSize: 12 },
    spotsSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10 },
    descriptionCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
    description: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 22 },
    descriptionEmpty: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    levelText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primaryInk },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
    ctaShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    outlineDangerButton: {
      minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.surface,
      flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    },
    outlineDangerText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.dangerInk },
  });
}
