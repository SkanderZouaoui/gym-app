import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Pill } from '../ui';

interface ProgramCardProps {
  name: string;
  isOwn: boolean;
  dayCount: number;
  todayLabel?: string;
  todayExerciseCount?: number;
  onPress: () => void;
  onStart?: () => void;
  highlighted?: boolean;
}

/** Carte programme — version mise en avant (fond secondary) ou compacte,
 * FitZone App Entraînement.dc.html, D1. */
export function ProgramCard({ name, isOwn, dayCount, todayLabel, todayExerciseCount, onPress, onStart, highlighted }: ProgramCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (highlighted) {
    return (
      <Pressable style={styles.heroCard} onPress={onPress}>
        <View style={styles.heroHeaderRow}>
          <Text style={styles.heroLabel}>EN COURS</Text>
          <Pill label={isOwn ? 'Personnel' : 'Coach'} tone="accent" />
        </View>
        <Text style={styles.heroName}>{name}</Text>
        <Text style={styles.heroMeta}>{dayCount} jour{dayCount > 1 ? 's' : ''} / semaine</Text>
        {todayLabel ? (
          <View style={styles.todayRow}>
            <Text style={styles.todayText}>
              Aujourd'hui : <Text style={styles.todayBold}>{todayLabel}</Text>
              {todayExerciseCount ? ` · ${todayExerciseCount} exercices` : ''}
            </Text>
          </View>
        ) : null}
        {onStart ? (
          <Pressable style={styles.startButton} onPress={onStart}>
            <MaterialIcons name="play-arrow" size={18} color={colors.primaryContrast} />
            <Text style={styles.startButtonText}>Démarrer</Text>
          </Pressable>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.compactCard} onPress={onPress}>
      <View style={styles.compactIcon}>
        <MaterialIcons name="fitness-center" size={20} color={colors.successInk} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.compactName}>{name}</Text>
        <Text style={styles.compactMeta}>{isOwn ? 'Personnel' : 'Coach'} · {dayCount} jour{dayCount > 1 ? 's' : ''}/semaine</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    heroCard: { backgroundColor: colors.secondary, borderRadius: radii.lg, padding: spacing.md, gap: 8 },
    heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.5, color: colors.onSecondary, opacity: 0.85 },
    heroName: { fontFamily: fonts.headSemiBold, fontSize: 20, color: colors.onSecondary },
    heroMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.onSecondary, opacity: 0.85 },
    todayRow: { marginTop: 4 },
    todayText: { fontFamily: fonts.body, fontSize: 13, color: colors.onSecondary, opacity: 0.9 },
    todayBold: { fontFamily: fonts.bodyBold },
    startButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44,
      borderRadius: radii.sm, backgroundColor: colors.primary, marginTop: 8,
    },
    startButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
    compactCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
      borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    compactIcon: {
      width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.successSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    compactName: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
    compactMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  });
}
