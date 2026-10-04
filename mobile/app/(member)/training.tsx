import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMyPrograms, useMyWorkouts } from '../../src/hooks/useCoaching';
import { useMyPoints } from '../../src/hooks/useMe';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function TrainingScreen() {
  const { data: programs } = useMyPrograms();
  const { data: workouts } = useMyWorkouts();
  const { data: points } = useMyPoints();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Entraînement</Text>

        <View style={styles.pointsCard}>
          <Text style={styles.pointsValue}>{points?.points ?? 0}</Text>
          <Text style={styles.pointsLabel}>points de fidélité</Text>
        </View>

        <Text style={styles.sectionTitle}>Mes programmes</Text>
        {programs?.length ? (
          programs.map((program) => (
            <View key={program.id} style={styles.card}>
              <Text style={styles.programName}>{program.name}</Text>
              {program.days.map((day) => (
                <View key={day.id} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{DAYS[day.dayOfWeek]}</Text>
                  <View style={{ flex: 1 }}>
                    {day.exercises.map((ex) => (
                      <Text key={ex.id} style={styles.exerciseLine}>
                        {ex.exercise.name} — {ex.sets}×{ex.reps}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Aucun programme assigné pour l'instant.</Text>
        )}

        <Text style={styles.sectionTitle}>Dernières séances</Text>
        {workouts?.length ? (
          workouts.slice(0, 5).map((log) => (
            <View key={log.id} style={styles.card}>
              <Text style={styles.workoutDate}>
                {new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
              {log.sets.map((s) => (
                <Text key={s.id} style={styles.exerciseLine}>
                  {s.exercise.name} {s.weightKg ? `· ${s.weightKg}kg` : ''} {s.reps ? `× ${s.reps}` : ''}
                </Text>
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Aucune séance enregistrée.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 120 },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary, marginBottom: spacing.sm },
  pointsCard: {
    backgroundColor: colors.accentSoft, borderRadius: radii.md, borderWidth: 1, borderColor: colors.accentBorder,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm,
  },
  pointsValue: { fontFamily: fonts.head, fontSize: 28, color: colors.accentInk },
  pointsLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.accentInk },
  sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 8,
  },
  programName: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
  dayRow: { flexDirection: 'row', gap: 10 },
  dayLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk, width: 36 },
  exerciseLine: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  workoutDate: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  empty: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
});
