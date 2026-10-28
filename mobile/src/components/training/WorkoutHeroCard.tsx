import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface WorkoutHeroCardProps {
  /** Durée déjà formatée (ex. « 48:00 »). */
  duration: string;
  /** Avancement de l'anneau, entre 0 et 1. */
  progress: number;
  /** Texte au centre de l'anneau (ex. « 60% »). */
  ringLabel: string;
  volume: string;
  sets: string;
}

const RING = 88;
const STROKE = 9;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/** Carte héro des séances v2 (séance en cours et détail d'historique) : durée en grand chiffre,
 * anneau d'avancement, tuiles volume et séries. */
export function WorkoutHeroCard({ duration, progress, ringLabel, volume, sets }: WorkoutHeroCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.shadow}>
      <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.kicker}>DURÉE</Text>
            <Text style={styles.duration}>{duration}</Text>
          </View>
          <View style={styles.ring}>
            <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.25)" strokeWidth={STROKE} fill="none" />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke="#FFFFFF"
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={CIRC * (1 - Math.min(1, Math.max(0, progress)))}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={styles.ringLabel}>{ringLabel}</Text>
            </View>
          </View>
        </View>
        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Volume</Text>
            <Text style={styles.tileValue}>{volume}</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Séries</Text>
            <Text style={styles.tileValue}>{sets}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    shadow: {
      borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
    },
    card: { borderRadius: radii.xl, padding: 22 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    kicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.92)' },
    duration: { fontFamily: fonts.head, fontSize: 46, lineHeight: 52, letterSpacing: -2, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
    ring: { width: RING, height: RING },
    ringCenter: { ...(StyleSheet.absoluteFill as object), alignItems: 'center', justifyContent: 'center' },
    ringLabel: { fontFamily: fonts.head, fontSize: 18, color: '#FFFFFF' },
    tiles: { flexDirection: 'row', gap: 10, marginTop: 16 },
    tile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
    tileLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: 'rgba(255,255,255,0.9)' },
    tileValue: { fontFamily: fonts.head, fontSize: 17, color: '#FFFFFF' },
  });
}
