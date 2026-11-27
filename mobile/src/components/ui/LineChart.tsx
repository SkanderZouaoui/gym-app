import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { haptics } from '../../utils/haptics';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface LineChartProps {
  points: number[];
  labels: string[];
  height?: number;
  color?: string;
  /** Point mis en évidence (index) ; avec `onSelect`, la courbe devient interactive (toucher ou glisser le doigt). */
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

/** Courbe en aire dégradée avec point final — utilisée pour le poids dans Progression. */
export function LineChart({ points, labels, height = 140, color, selectedIndex, onSelect }: LineChartProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const box = useRef<React.ComponentRef<typeof View>>(null);
  const [frame, setFrame] = useState({ x: 0, w: 0 });
  const lastIndex = useRef(-1);
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

  const pick = (e: GestureResponderEvent) => {
    if (!onSelect || frame.w <= 0) return;
    const rel = (e.nativeEvent.pageX - frame.x) / frame.w;
    const i = Math.min(points.length - 1, Math.max(0, Math.round(rel * (points.length - 1))));
    if (i !== lastIndex.current) {
      lastIndex.current = i;
      haptics.selection();
      onSelect(i);
    }
  };
  const sel = selectedIndex != null && coords[selectedIndex] ? coords[selectedIndex] : null;

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return (
    <View
      ref={box}
      onLayout={() => box.current?.measureInWindow((x, _y, w) => setFrame({ x, w }))}
      onTouchStart={pick}
      onTouchMove={pick}
      onTouchEnd={() => { lastIndex.current = -1; }}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.25} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaGradient)" />
        <Path d={linePath} stroke={lineColor} strokeWidth={2.5} fill="none" />
        {sel ? <Line x1={sel.x} y1={0} x2={sel.x} y2={height} stroke={lineColor} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 4" /> : null}
        {coords.map((c, i) => (onSelect && i !== selectedIndex ? <Circle key={i} cx={c.x} cy={c.y} r={2.5} fill={lineColor} fillOpacity={0.55} /> : null))}
        <Circle cx={(sel ?? coords[coords.length - 1]).x} cy={(sel ?? coords[coords.length - 1]).y} r={sel ? 6.5 : 5} fill={colors.surface} stroke={lineColor} strokeWidth={2.5} />
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
