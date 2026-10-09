import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Pill, type PillTone } from '../ui';

interface DayScheduleRowProps {
  time: string;
  name: string;
  meta: string;
  statusLabel: string;
  statusTone: PillTone;
  isPast?: boolean;
  onPress?: () => void;
}

/** Ligne "Ma journée" de l'Accueil Coach — cours collectifs et séances individuelles mélangés. */
export function DayScheduleRow({ time, name, meta, statusLabel, statusTone, isPast, onPress }: DayScheduleRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={[styles.row, isPast && styles.rowPast]} onPress={onPress}>
      <Text style={styles.time}>{time}</Text>
      <View style={styles.bar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <Pill label={statusLabel} tone={statusTone} />
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    rowPast: { opacity: 0.6 },
    time: { fontFamily: fonts.headBold, fontSize: 13, color: colors.text, width: 42 },
    bar: { width: 4, height: 28, borderRadius: 2, backgroundColor: colors.primary },
    name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  });
}
