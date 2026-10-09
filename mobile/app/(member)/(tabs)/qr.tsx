import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { meApi } from '../../../src/api/endpoints';
import { useMe, useMyBookings, useMyMemberships } from '../../../src/hooks/useMe';
import { useOfflineQrToken } from '../../../src/hooks/useOfflineQrToken';
import { Avatar, Banner, CircularTimer, Pill } from '../../../src/components/ui';

// Repli uniquement : la vraie durée de vie vient de `expiresInSeconds`,
// renvoyée par le serveur à chaque émission de token (45s — qr-token.service.ts).
const FALLBACK_REFRESH_SECONDS = 45;

/** Écran "QR d'accès" — FitZone App Adherent.dc.html, C3. */
export default function QrScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [token, setToken] = useState<string | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(FALLBACK_REFRESH_SECONDS);
  const [secondsLeft, setSecondsLeft] = useState(FALLBACK_REFRESH_SECONDS);
  const [offline, setOffline] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: user } = useMe();
  const { data: memberships } = useMyMemberships();
  const { data: bookings } = useMyBookings();
  const activeMembership = memberships?.find((m) => m.status === 'ACTIVE');
  const offlineQr = useOfflineQrToken();

  const fetchToken = async () => {
    try {
      const res = await meApi.getQrToken();
      setToken(res.token);
      setTotalSeconds(res.expiresInSeconds);
      setSecondsLeft(res.expiresInSeconds);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  };

  useEffect(() => {
    fetchToken();
    const countdown = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          fetchToken();
          return FALLBACK_REFRESH_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    refreshTimer.current = countdown;
    return () => clearInterval(countdown);
  }, []);

  const nextBooking = bookings
    ?.filter((b) => b.status === 'CONFIRMED' && b.session && new Date(b.session.startsAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.session!.startsAt).getTime() - new Date(b.session!.startsAt).getTime())[0];

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>QR d'accès</Text>
          <View style={styles.brightnessRow}>
            <MaterialIcons name="brightness-high" size={16} color={colors.muted} />
            <Text style={styles.brightnessText}>Luminosité max</Text>
          </View>
        </View>

        {offline || !token ? (
          <Banner
            tone="warning"
            icon="wifi-off"
            text={
              offlineQr.token
                ? `Mode hors ligne : code de secours valable jusqu'à ${new Date(offlineQr.expiresAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`
                : "Mode hors ligne : aucun code de secours en cache. Connectez-vous au réseau pour en générer un."
            }
          />
        ) : null}

        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.qrCard}
        >
          <View style={styles.qrGlow} />
          <View style={styles.qrBox}>
            {token ? (
              <QRCode value={token} size={204} color={colors.secondary} backgroundColor="transparent" />
            ) : offlineQr.token ? (
              <QRCode value={offlineQr.token} size={204} color={colors.secondary} backgroundColor="transparent" />
            ) : (
              <MaterialIcons name="qr-code-2" size={204} color={colors.border} />
            )}
          </View>

          {!offline ? (
            <View style={styles.countdownRow}>
              <CircularTimer progress={secondsLeft / totalSeconds} size={26} color="#FFFFFF" trackColor="rgba(255,255,255,0.25)" filled />
              <Text style={styles.countdownText}>Nouveau code dans 0:{String(secondsLeft).padStart(2, '0')}</Text>
            </View>
          ) : offlineQr.token ? (
            <View style={styles.countdownPill}>
              <MaterialIcons name="verified-user" size={16} color={colors.secondary} />
              <Text style={styles.countdownPillText}>Code de secours · usage unique</Text>
            </View>
          ) : (
            <View style={styles.countdownPill}>
              <MaterialIcons name="error-outline" size={16} color={colors.dangerInk} />
              <Text style={[styles.countdownPillText, { color: colors.dangerInk }]}>Aucun code disponible hors ligne</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.identityCard}>
          <Avatar initials={initials || 'AD'} background={colors.primarySoft} color={colors.primaryInk} />
          <View style={{ flex: 1 }}>
            <Text style={styles.identityName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.identityMeta}>
              {activeMembership?.plan.name ?? 'Sans abonnement'}
              {activeMembership ? ` · jusqu'au ${new Date(activeMembership.endDate).toLocaleDateString('fr-FR')}` : ''}
            </Text>
          </View>
          {activeMembership ? <Pill label="Actif" tone="success" /> : null}
        </View>

        {nextBooking?.session ? (
          <View style={styles.bookingCard}>
            <View style={styles.bookingIcon}>
              <MaterialIcons name="local-fire-department" size={22} color={colors.primaryInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingLabel}>PROCHAIN COURS</Text>
              <Text style={styles.bookingClass}>{nextBooking.session.classType.name}</Text>
              <Text style={styles.bookingMeta}>
                {new Date(nextBooking.session.startsAt).toLocaleString('fr-FR', {
                  weekday: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { flex: 1, padding: spacing.lg, gap: spacing.md },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: fonts.head, fontSize: 26, color: colors.text },
    brightnessRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    brightnessText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    qrCard: {
      borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.md,
      overflow: 'hidden',
      shadowColor: colors.secondary, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
    },
    qrGlow: {
      position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: 110,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    qrBox: {
      width: 236, height: 236, borderRadius: radii.md, backgroundColor: '#FFFFFF',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },
    countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countdownText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#FFFFFF' },
    countdownPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF',
      height: 32, paddingHorizontal: 12, borderRadius: 999,
    },
    countdownPillText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.secondary },
    identityCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
      borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    identityName: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    identityMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    bookingCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySoft,
      borderRadius: radii.md, borderWidth: 1, borderColor: colors.primaryBorder, padding: spacing.md,
    },
    bookingIcon: {
      width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    bookingLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.primaryInk, letterSpacing: 0.5 },
    bookingClass: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    bookingMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  });
}
