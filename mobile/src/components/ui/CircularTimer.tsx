import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

interface CircularTimerProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Disque plein qui se remplit (camembert) au lieu d'un anneau fin. */
  filled?: boolean;
}

/** Anneau (ou disque plein) de progression circulaire (ex. compte à rebours du QR d'accès). */
export function CircularTimer({ progress, size = 32, strokeWidth = 3, color, trackColor, filled }: CircularTimerProps) {
  const { colors } = useTheme();
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const strokeColor = color ?? colors.primary;
  const trackStrokeColor = trackColor ?? colors.border;

  if (filled) {
    // Un trait dont l'épaisseur = rayon du cercle intérieur transforme le
    // "contour" en disque plein — plus simple et plus fiable qu'un arc
    // tracé à la main (pas de calcul de grand-arc >180°).
    const radius = size / 4;
    const fullStrokeWidth = size / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - clampedProgress);
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackStrokeColor} strokeWidth={fullStrokeWidth} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={fullStrokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
      </View>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampedProgress);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackStrokeColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
