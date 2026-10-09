import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface ProgressBarProps {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({ progress, color, trackColor, height = 8 }: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, progress));
  const fillColor = color ?? colors.primary;
  const bgColor = trackColor ?? colors.border;
  return (
    <View style={[styles.track, { backgroundColor: bgColor, height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { backgroundColor: fillColor, width: `${pct * 100}%`, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
