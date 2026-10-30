import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useLanguage } from '../../../src/i18n/LanguageContext';
import { meApi } from '../../../src/api/endpoints';
import { useMe, useMyBookings, useMyMemberships } from '../../../src/hooks/useMe';
import { useOfflineQrToken } from '../../../src/hooks/useOfflineQrToken';
import { Avatar, Banner, Pill, ProgressBar, ScreenTitle } from '../../../src/components/ui';
import { dateLocale } from '../../../src/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';

// Repli uniquement : la vraie durée de vie vient de `expiresInSeconds`,
// renvoyée par le serveur à chaque émission de token (45s — qr-token.service.ts).
const FALLBACK_REFRESH_SECONDS = 45;

/** Écran "QR d'accès" — FitZone App Adherent.dc.html, C3. */
export default function QrScreen() {
  const pullClient = useQueryClient();
  const { refreshing: pullRefreshing, onRefresh: pullOnRefresh } = useOfflineAwareRefresh(() => pullClient.invalidateQueries());
  const { colors, cardShadow } = useTheme();
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isRtl), [colors, isRtl]);
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
      <ScrollView
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={pullOnRefresh} />} contentContainerStyle={styles.container}>
        <ScreenTitle title={t('qr.title')} subtitle={t('qr.subtitle')} />

        {offline || !token ? (
          <Banner
            tone="warning"
            icon="wifi-off"
            text={
              offlineQr.token
                ? t('qr.offlineWithFallback', {
                    time: new Date(offlineQr.expiresAt!).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }),
                  })
                : t('qr.offlineNoFallback')
            }
          />
        ) : null}

        <View style={[styles.qrCard, cardShadow]}>
          <View style={styles.qrBox}>
            {token ? (
              <QRCode value={token} size={210} color="#0E0D12" backgroundColor="#FFFFFF" />
            ) : offlineQr.token ? (
              <QRCode value={offlineQr.token} size={210} color="#0E0D12" backgroundColor="#FFFFFF" />
            ) : (
              <MaterialIcons name="qr-code-2" size={210} color={colors.border} />
            )}
          </View>
          {offline && offlineQr.token ? (
            <View style={styles.countdownPill}>
              <MaterialIcons name="verified-user" size={16} color={colors.primaryInk} />
              <Text style={styles.countdownPillText}>{t('qr.fallbackCode')}</Text>
            </View>
          ) : offline ? (
            <View style={styles.countdownPill}>
              <MaterialIcons name="error-outline" size={16} color={colors.dangerInk} />
              <Text style={[styles.countdownPillText, { color: colors.dangerInk }]}>{t('qr.noOfflineCode')}</Text>
            </View>
          ) : null}
        </View>

        {!offline ? (
          <View style={[styles.dynamicCard, cardShadow]}>
            <View style={styles.dynamicRow}>
              <View style={styles.dynamicLabel}>
                <MaterialIcons name="autorenew" size={20} color={colors.primaryInk} />
                <Text style={styles.dynamicText}>{t('qr.dynamicCode')}</Text>
              </View>
              <Text style={styles.dynamicSeconds}>{secondsLeft} s</Text>
            </View>
            <ProgressBar progress={secondsLeft / totalSeconds} color={colors.primary} />
            <Text style={styles.dynamicHint}>{t('qr.dynamicHint')}</Text>
          </View>
        ) : null}

        <View style={styles.identityCard}>
          <Avatar initials={initials || 'AD'} background={colors.primarySoft} color={colors.primaryInk} />
          <View style={{ flex: 1 }}>
            <Text style={styles.identityName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.identityMeta}>
              {activeMembership?.plan.name ?? t('home.membershipNone')}
              {activeMembership ? t('qr.membershipUntil', { date: new Date(activeMembership.endDate).toLocaleDateString(dateLocale()) }) : ''}
            </Text>
          </View>
          {activeMembership ? <Pill label={t('qr.membershipActive')} tone="success" /> : null}
        </View>

        {nextBooking?.session ? (
          <View style={styles.bookingCard}>
            <View style={styles.bookingIcon}>
              <MaterialIcons name="local-fire-department" size={22} color={colors.primaryInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingLabel}>{t('qr.nextCourse')}</Text>
              <Text style={styles.bookingClass}>{nextBooking.session.classType.name}</Text>
              <Text style={styles.bookingMeta}>
                {new Date(nextBooking.session.startsAt).toLocaleString(dateLocale(), {
                  weekday: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isRtl: boolean) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    qrCard: {
      backgroundColor: '#FFFFFF', borderRadius: 26, padding: 26, alignItems: 'center', gap: spacing.md,
      borderWidth: 1, borderColor: colors.border,
    },
    qrBox: { alignItems: 'center', justifyContent: 'center' },
    countdownPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft,
      height: 32, paddingHorizontal: 12, borderRadius: 999,
    },
    countdownPillText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.primaryInk },
    dynamicCard: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      padding: 14, gap: 10,
    },
    dynamicRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dynamicLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dynamicText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    dynamicSeconds: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primaryInk },
    dynamicHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    identityCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14,
    },
    identityName: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    identityMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    bookingCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySoft,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.primaryBorder, padding: 14,
    },
    bookingIcon: {
      width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    bookingLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.primaryInk, letterSpacing: 0.5 },
    bookingClass: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    bookingMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  });
}
