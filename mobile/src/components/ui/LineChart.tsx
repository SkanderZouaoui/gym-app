import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface LineChartProps {
  points: number[];
  labels: string[];
  height?: number;
  color?: string;
}

/** Courbe en aire dégradée avec point final — utilisée pour le poids dans Progression. */
export function LineChart({ points, labels, height = 140, color }: LineChartProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const lineColor = color ?? colors.primary;
  if (points.length < 2) return null;
  const width = 320;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: height - ((p - min) / range) * (height - 20) - 10,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.25} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaGradient)" />
        <Path d={linePath} stroke={lineColor} strokeWidth={2.5} fill="none" />
        <Circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={5} fill={colors.surface} stroke={lineColor} strokeWidth={2.5} />
      </Svg>
      <View style={styles.labelsRow}>
        {labels.map((l, i) => (
          <Text key={i} style={styles.label}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    label: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted },
  });
}
