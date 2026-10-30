import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { HScroll } from '../ui/HScroll';

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
    <HScroll contentContainerStyle={styles.row}>
      {days.map((d, i) => {
        const active = i === selectedIndex;
        return (
          <Pressable key={d.date.toISOString()} onPress={() => onSelect(i)} style={[styles.cell, active && styles.active]}>
            {active ? (
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            ) : null}
            <Text style={[styles.label, active && styles.activeText]}>{d.label}</Text>
            <Text style={[styles.number, active && styles.activeText]}>{d.dayNumber}</Text>
          </Pressable>
        );
      })}
    </HScroll>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { gap: 8, paddingVertical: 4 },
    cell: { width: 50, height: 60, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    active: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
    number: { fontFamily: fonts.headBold, fontSize: 16, letterSpacing: -0.3, color: colors.text },
    activeText: { color: colors.primaryContrast },
  });
}
