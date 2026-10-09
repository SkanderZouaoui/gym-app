import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Pill } from '../ui';

interface NextCourseCardProps {
  className: string;
  meta: string;
  countdownText?: string;
  booked?: boolean;
  onPress?: () => void;
}

/** Carte "Prochain cours" de l'Accueil adhérent — FitZone App Adherent.dc.html, B1. */
export function NextCourseCard({ className, meta, countdownText, booked, onPress }: NextCourseCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>PROCHAIN COURS</Text>
        {booked ? <Pill label="Réservé" tone="success" /> : null}
      </View>
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialIcons name="local-fire-department" size={26} color={colors.primaryInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.className}>{className}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
      </View>
      {countdownText ? (
        <View style={styles.countdownRow}>
          <MaterialIcons name="schedule" size={15} color={colors.muted} />
          <Text style={styles.countdown}>{countdownText}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 10,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.5, color: colors.muted },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: { width: 52, height: 52, borderRadius: radii.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    className: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    countdown: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  });
}
