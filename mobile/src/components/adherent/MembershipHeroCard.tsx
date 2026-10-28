import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { fonts, radii, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface MembershipHeroCardProps {
  planName: string;
  /** Ex. « 27 avr → 27 oct 2026 ». */
  periodLabel?: string;
  daysLeft?: number;
  /** Part de la durée restante, entre 0 et 1 (anneau). */
  remainingRatio?: number;
  expired?: boolean;
  onPressQr: () => void;
}

const RING = 92;
const STROKE = 8;
const RADIUS = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

/** Carte héro « Formule active » de l'Accueil adhérent v2 : dégradé d'accent, lueur,
 * jours restants en grand chiffre avec anneau de progression, bouton QR blanc. */
export function MembershipHeroCard({ planName, periodLabel, daysLeft, remainingRatio = 0, expired, onPressQr }: MembershipHeroCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const showDays = daysLeft !== undefined && !expired;

  return (
    <View style={styles.shadow}>
      <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.label}>{expired ? t('home.heroLabelInactive') : t('home.heroLabel')}</Text>
          <View style={styles.status}>
            <Text style={styles.statusText}>{expired ? t('home.statusExpired') : t('home.statusActive')}</Text>
          </View>
        </View>
        <Text style={styles.plan} numberOfLines={1}>{planName}</Text>
        {periodLabel ? <Text style={styles.period}>{periodLabel}</Text> : null}

        {showDays ? (
          <View style={styles.daysRow}>
            <View>
              <Text style={styles.daysValue}>{daysLeft}</Text>
              <Text style={styles.period}>{t('home.daysLeft')}</Text>
            </View>
            <View style={styles.ring}>
              <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke="rgba(255,255,255,0.25)" strokeWidth={STROKE} fill="none" />
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  stroke="#FFFFFF"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${CIRC} ${CIRC}`}
                  strokeDashoffset={CIRC * (1 - Math.min(1, Math.max(0, remainingRatio)))}
                />
              </Svg>
            </View>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.qrButton, expired && styles.qrButtonDisabled, pressed && { transform: [{ scale: 0.97 }] }]}
          onPress={onPressQr}
        >
          <MaterialIcons name="qr-code-2" size={22} color={colors.primaryInk} />
          <Text style={styles.qrButtonText}>{t('home.qrCardButton')}</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    shadow: {
      borderRadius: radii.xl,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 8,
    },
    card: { borderRadius: radii.xl, padding: 22 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.9)' },
    status: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    plan: { ...typography.title, fontSize: 28, letterSpacing: -0.7, color: '#FFFFFF', marginTop: 10 },
    period: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
    daysRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
    daysValue: { fontFamily: fonts.head, fontSize: 68, lineHeight: 70, letterSpacing: -3.4, color: '#FFFFFF' },
    ring: { width: RING, height: RING },
    qrButton: {
      marginTop: 16,
      height: 46,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    qrButtonDisabled: { opacity: 0.6 },
    qrButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
  });
}
