import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface BarHistogramProps {
  values: number[];
  highlightIndex?: number;
  height?: number;
  color?: string;
  highlightColor?: string;
}

/** Histogramme de barres simple — régularité hebdomadaire, affluence horaire. */
export function BarHistogram({ values, highlightIndex, height = 48, color, highlightColor }: BarHistogramProps) {
  const { colors } = useTheme();
  const barColor = color ?? colors.secondary;
  const barHighlightColor = highlightColor ?? colors.primary;
  const max = Math.max(...values, 1);
  return (
    <View style={[styles.row, { height }]}>
      {values.map((v, i) => (
        <View key={i} style={styles.barWrap}>
          <View
            style={[
              styles.bar,
              {
                height: Math.max(4, (v / max) * height),
                backgroundColor: i === highlightIndex ? barHighlightColor : barColor,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barWrap: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', borderRadius: 3 },
});
