import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { controlHeight, fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useProgramDetail } from '../../../src/hooks/useCoachSessions';
import { useDeleteOwnProgram } from '../../../src/hooks/useCoaching';
import { Button } from '../../../src/components/Button';
import { BottomSheet } from '../../../src/components/ui';

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Détail du programme — FitZone App Entraînement.dc.html, D2. */
export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: program, isLoading } = useProgramDetail(id);
  const deleteProgram = useDeleteOwnProgram();
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading || !program) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isOwn = program.createdById === program.assignedToId;
  const day = program.days[activeDayIndex];

  const handleDelete = () => {
    deleteProgram.mutate(program.id, { onSuccess: () => router.replace('/(member)/(tabs)/training') });
  };

  const estimatedMinutes = day
    ? Math.round(
        day.exercises.reduce((total, ex) => total + ex.sets * (45 + (ex.restSeconds ?? 60)), 0) / 60,
      )
    : 0;
  const mainMuscleGroup = day?.exercises.find((ex) => ex.exercise.muscleGroup)?.exercise.muscleGroup;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="" fallbackHref="/(member)/(tabs)/training" />
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{program.name}</Text>
            <Text style={styles.subtitle}>{program.days.length} jour{program.days.length > 1 ? 's' : ''} / semaine</Text>
          </View>
          {isOwn ? (
            <Pressable style={styles.headerActionButton} onPress={() => setMenuOpen(true)} hitSlop={8}>
              <MaterialIcons name="more-vert" size={20} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.dayTabsWrap}>
        {program.days.map((d, i) => (
          <Pressable
            key={d.id}
            onPress={() => setActiveDayIndex(i)}
            style={[styles.dayTab, i === activeDayIndex && styles.dayTabActive]}
          >
            <Text style={[styles.dayTabText, i === activeDayIndex && styles.dayTabTextActive]}>
              {d.label ?? DAY_LABELS[d.dayOfWeek]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="schedule" size={18} color={colors.muted} />
            <Text style={styles.summaryValue}>≈ {estimatedMinutes} min</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <MaterialIcons name="format-list-bulleted" size={18} color={colors.muted} />
            <Text style={styles.summaryValue}>{day?.exercises.length ?? 0} exercices</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <MaterialIcons name="track-changes" size={18} color={colors.muted} />
            <Text style={styles.summaryValue} numberOfLines={1}>{mainMuscleGroup ?? '—'}</Text>
          </View>
        </View>

        {day?.exercises.map((ex, i) => {
          const firstSet = ex.setDetails[0];
          return (
            <Pressable
              key={ex.id}
              style={styles.exerciseCard}
              onPress={() =>
                router.push({
                  pathname: '/(member)/exercises/view',
                  params: { exerciseId: ex.exercise.id, sets: String(ex.sets), reps: ex.reps, setDetails: JSON.stringify(ex.setDetails), programId: program.id },
                })
              }
            >
              <Text style={styles.exerciseIndexText}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={styles.exerciseThumb}>
                <MaterialIcons name="fitness-center" size={18} color={colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {ex.sets} × {ex.reps}
                  {ex.restSeconds ? `  repos ${ex.restSeconds} s` : ''}
                  {firstSet?.weightKg ? `  ${firstSet.weightKg} kg` : ''}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.startButton}
          onPress={() => day && router.push(`/(member)/session/live/${program.id}/${day.id}`)}
        >
          <MaterialIcons name="play-arrow" size={20} color={colors.primaryContrast} />
          <Text style={styles.startButtonText}>
            Démarrer {day?.label ?? DAY_LABELS[day?.dayOfWeek ?? 0]}
          </Text>
        </Pressable>
      </View>

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <Pressable
          style={styles.menuItem}
          onPress={() => {
            setMenuOpen(false);
            router.push({ pathname: '/(member)/program-builder', params: { programId: program.id } });
          }}
        >
          <MaterialIcons name="edit" size={20} color={colors.text} />
          <Text style={styles.menuItemText}>Modifier le programme</Text>
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => {
            setMenuOpen(false);
            setConfirmDelete(true);
          }}
        >
          <MaterialIcons name="delete-outline" size={20} color={colors.dangerInk} />
          <Text style={[styles.menuItemText, { color: colors.dangerInk }]}>Supprimer le programme</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text style={styles.sheetTitle}>Supprimer « {program.name} » ?</Text>
        <Text style={styles.sheetText}>Cette action est définitive et supprime tous les jours et exercices de ce programme.</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Supprimer" onPress={handleDelete} variant="secondary" loading={deleteProgram.isPending} />
          <Button label="Annuler" onPress={() => setConfirmDelete(false)} variant="outline" />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, gap: 2 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerActionButton: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  dayTabsWrap: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 6,
  },
  dayTab: {
    flex: 1, height: 44, borderRadius: radii.sm, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  dayTabActive: { backgroundColor: colors.primarySoft },
  dayTabText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  dayTabTextActive: { color: colors.primaryInk },
  content: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: 140 },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, marginBottom: spacing.xs,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  summaryValue: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.text, textTransform: 'capitalize' },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  exerciseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm,
  },
  exerciseThumb: {
    width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  exerciseIndexText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted, width: 18 },
  exerciseName: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text, textTransform: 'capitalize' },
  exerciseMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
  },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: controlHeight, borderRadius: radii.sm, backgroundColor: colors.primary,
  },
  startButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryContrast },
  sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
  sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 50, paddingHorizontal: spacing.xs,
  },
  menuItemText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  });
}
