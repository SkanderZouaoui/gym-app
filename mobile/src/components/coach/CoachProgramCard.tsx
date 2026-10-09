import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useProgramDetail } from '../../hooks/useCoachSessions';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/** Carte programme avec détail par exercice, chaque ligne ouvrant la fiche
 * en lecture seule (GIF, instructions, séries). FitZone App Coach.dc.html, L2. */
export function CoachProgramCard({ programId, studentId }: { programId: string; studentId: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: program } = useProgramDetail(programId);
  if (!program) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.programName}>{program.name}</Text>
      {program.days.map((day) => (
        <View key={day.id} style={styles.dayRow}>
          <Text style={styles.dayLabel}>{day.label ?? DAYS[day.dayOfWeek]}</Text>
          <View style={{ flex: 1 }}>
            {day.exercises.map((ex) => (
              <Pressable
                key={ex.id}
                onPress={() =>
                  router.push({
                    pathname: '/(coach)/exercises/view',
                    params: {
                      exerciseId: ex.exercise.id,
                      sets: String(ex.sets),
                      reps: ex.reps,
                      setDetails: JSON.stringify(ex.setDetails),
                      studentId,
                    },
                  })
                }
              >
                <Text style={styles.exerciseLine} numberOfLines={1}>
                  {ex.exercise.name} — {ex.sets}×{ex.reps}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 8,
    },
    programName: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
    dayRow: { flexDirection: 'row', gap: 10 },
    dayLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk, width: 46 },
    exerciseLine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textTransform: 'capitalize' },
  });
}
