import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCoachPrograms, useCoachStudents, useStudentWorkouts } from '../../../src/hooks/useCoachSessions';
import { Avatar, EmptyState } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import { CoachProgramCard } from '../../../src/components/coach/CoachProgramCard';

/** Fiche élève — FitZone App Coach.dc.html, L2. */
export default function CoachStudentDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: students } = useCoachStudents();
  const { data: programs } = useCoachPrograms();
  const { data: workouts } = useStudentWorkouts(id);

  const student = students?.find((s) => s.id === id);
  const studentPrograms = programs?.filter((p) => p.assignedTo.id === id) ?? [];

  if (!student) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="" fallbackHref="/(coach)/(tabs)/students" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.identityRow}>
          <Avatar initials={`${student.firstName[0]}${student.lastName[0]}`.toUpperCase()} size={68} background={colors.accent} color={colors.onAccent} />
          <Text style={styles.name}>{student.firstName} {student.lastName}</Text>
        </View>

        <Text style={styles.sectionTitle}>Programmes</Text>
        {studentPrograms.length === 0 ? (
          <EmptyState icon="fitness-center" title="Aucun programme assigné" text="Assignez un programme à cet élève." tone="primary" />
        ) : (
          studentPrograms.map((p) => <CoachProgramCard key={p.id} programId={p.id} studentId={id!} />)
        )}
        <Button
          label="Assigner un programme"
          variant="outline"
          onPress={() => router.push({ pathname: '/(coach)/program-builder', params: { studentId: id, studentName: `${student.firstName} ${student.lastName}` } })}
        />

        <Text style={styles.sectionTitle}>Séances récentes</Text>
        {workouts?.length ? (
          workouts.slice(0, 10).map((log) => (
            <View key={log.id} style={styles.card}>
              <Text style={styles.workoutDate}>
                {new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
              {log.sets.map((s) => (
                <Text key={s.id} style={styles.exerciseLine}>
                  {s.exercise.name} {s.weightKg ? `· ${s.weightKg}kg` : ''} {s.reps ? `× ${s.reps}` : ''}
                </Text>
              ))}
            </View>
          ))
        ) : (
          <EmptyState icon="history" title="Aucune séance" text="Les séances suivies apparaîtront ici." tone="muted" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 60 },
    identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    name: { fontFamily: fonts.head, fontSize: 22, color: colors.text },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 6,
    },
    workoutDate: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    exerciseLine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textTransform: 'capitalize' },
  });
}
