import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { meApi } from '../../src/api/endpoints';
import { useMyBookings } from '../../src/hooks/useMe';

export default function QrScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { data: bookings } = useMyBookings();

  const nextBooking = bookings
    ?.filter((b) => b.status === 'CONFIRMED' && b.session)
    .sort((a, b) => new Date(a.session!.startsAt).getTime() - new Date(b.session!.startsAt).getTime())[0];

  const fetchToken = async () => {
    const res = await meApi.getQrToken();
    setToken(res.token);
    setSecondsLeft(res.expiresInSeconds);
  };

  useEffect(() => {
    fetchToken();
    const countdown = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          fetchToken();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    refreshTimer.current = countdown;
    return () => clearInterval(countdown);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Mon QR de présence</Text>
        <Text style={styles.subtitle}>Présente ce code à ton coach à l'entrée du cours</Text>

        <View style={styles.qrBox}>
          {token ? (
            <QRCode value={token} size={220} color={colors.text} backgroundColor="transparent" />
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>

        <View style={styles.countdownPill}>
          <Text style={styles.countdownText}>Renouvelé dans {secondsLeft}s</Text>
        </View>

        {nextBooking?.session ? (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingLabel}>PROCHAIN COURS</Text>
            <Text style={styles.bookingClass}>{nextBooking.session.classType.name}</Text>
            <Text style={styles.bookingMeta}>
              {new Date(nextBooking.session.startsAt).toLocaleString('fr-FR', {
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>Code si besoin :</Text>
              <Text style={styles.code}>{nextBooking.bookingCode}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noBooking}>Aucune réservation à venir</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  title: { fontFamily: fonts.head, fontSize: 22, color: colors.secondary, marginTop: spacing.md },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
  qrBox: {
    width: 260, height: 260, borderRadius: radii.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.md,
  },
  countdownPill: {
    backgroundColor: colors.secondarySoft, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  countdownText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.secondaryInk },
  bookingCard: {
    width: '100%', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: 6, marginTop: spacing.md,
  },
  bookingLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted, letterSpacing: 0.5 },
  bookingClass: { fontFamily: fonts.headSemiBold, fontSize: 17, color: colors.text },
  bookingMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  codeRow: { flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' },
  codeLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  code: { fontFamily: fonts.headBold, fontSize: 14, color: colors.primaryInk, letterSpacing: 1 },
  noBooking: { fontFamily: fonts.body, color: colors.muted, marginTop: spacing.md },
});
