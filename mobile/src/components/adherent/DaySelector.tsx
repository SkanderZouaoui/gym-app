import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface DaySelectorProps {
  days: { label: string; dayNumber: string; date: Date }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/** Sélecteur de 7 jours utilisé en haut du Planning (vue Jour). */
export function DaySelector({ days, selectedIndex, onSelect }: DaySelectorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      {days.map((d, i) => {
        const active = i === selectedIndex;
        return (
          <Pressable key={d.date.toISOString()} onPress={() => onSelect(i)} style={[styles.cell, active && styles.active]}>
            <Text style={[styles.label, active && styles.activeText]}>{d.label}</Text>
            <Text style={[styles.number, active && styles.activeText]}>{d.dayNumber}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 4 },
    cell: { flex: 1, height: 56, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', gap: 2 },
    active: { backgroundColor: colors.secondary },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
    number: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
    activeText: { color: colors.onSecondary },
  });
}
