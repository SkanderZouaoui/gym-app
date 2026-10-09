import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme, type ColorPalette } from '../../../src/theme/ThemeContext';
import { useMyWorkouts } from '../../../src/hooks/useCoaching';

const FEELING_STYLES: Record<string, { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: (c: ColorPalette) => string; bg: (c: ColorPalette) => string }> = {
  EASY: { label: 'Facile', icon: 'sentiment-very-satisfied', color: (c) => c.successInk, bg: (c) => c.successSoft },
  OK: { label: 'Correct', icon: 'sentiment-satisfied', color: (c) => c.infoInk, bg: (c) => c.infoSoft },
  HARD: { label: 'Difficile', icon: 'sentiment-dissatisfied', color: (c) => c.dangerInk, bg: (c) => c.dangerSoft },
};

/** Détail d'une séance de l'historique — lecture seule, même mise en page
 * que la séance guidée (session/live) mais sans aucune saisie ni action. */
export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: workouts, isLoading } = useMyWorkouts();
  const log = workouts?.find((w) => w.id === id);

  const exerciseGroups = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof log>['sets']>();
    if (!log) return [];
    for (const s of log.sets) {
      if (!groups.has(s.exerciseId)) groups.set(s.exerciseId, []);
      groups.get(s.exerciseId)!.push(s);
    }
    return Array.from(groups.entries());
  }, [log]);

  if (isLoading || !log) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/training'))} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.topBarTitle}>Séance passée</Text>
          <Text style={styles.topBarSub}>
            {new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <View style={styles.readOnlyPill}>
          <Text style={styles.readOnlyPillText}>Lecture seule</Text>
        </View>
      </View>

      {log.feeling ? (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xs }}>
          {(() => {
            const feelingStyle = FEELING_STYLES[log.feeling];
            const feelingColor = feelingStyle ? feelingStyle.color(colors) : colors.text;
            const feelingBg = feelingStyle ? feelingStyle.bg(colors) : colors.surface2;
            return (
              <View style={[styles.feelingBadge, { backgroundColor: feelingBg }]}>
                <MaterialIcons name={feelingStyle?.icon ?? 'sentiment-satisfied'} size={16} color={feelingColor} />
                <Text style={[styles.feelingText, { color: feelingColor }]}>
                  Ressenti : {feelingStyle?.label ?? log.feeling}
                </Text>
              </View>
            );
          })()}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {exerciseGroups.map(([exId, exSets], exIndex) => (
          <View key={exId} style={styles.exerciseBlock}>
            <View style={styles.exerciseHeaderRow}>
              <View style={styles.exerciseThumb}>
                <MaterialIcons name="fitness-center" size={20} color={colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseCounter}>EXERCICE {exIndex + 1} SUR {exerciseGroups.length}</Text>
                <Text style={styles.exerciseName}>{exSets[0]?.exercise.name}</Text>
                <Text style={styles.exerciseMeta}>{exSets.length} séries</Text>
              </View>
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: 40, textAlign: 'center' }]}>SÉRIE</Text>
                <Text style={[styles.tableHeaderText, { width: 70, textAlign: 'center' }]}>KG</Text>
                <Text style={[styles.tableHeaderText, { width: 70, textAlign: 'center' }]}>REP</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>RPE</Text>
              </View>
              {exSets.map((s) => (
                <View key={s.id} style={styles.row}>
                  <Text style={styles.setNumber}>{s.setNumber}</Text>
                  <Text style={styles.readValue}>{s.weightKg ? `${s.weightKg} kg` : '—'}</Text>
                  <Text style={styles.readValue}>{s.reps ?? '—'}</Text>
                  <Text style={styles.rpeValue}>{s.rpe ?? '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  topBarTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  topBarSub: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted, textTransform: 'capitalize' },
  readOnlyPill: { height: 32, paddingHorizontal: 14, borderRadius: radii.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  readOnlyPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
  feelingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    height: 36, paddingHorizontal: 14, borderRadius: radii.full,
  },
  feelingText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: 60, paddingTop: spacing.xs },
  exerciseBlock: { gap: spacing.sm },
  exerciseHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseThumb: {
    width: 52, height: 52, borderRadius: radii.sm, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  exerciseCounter: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.4, color: colors.primaryInk },
  exerciseName: { fontFamily: fonts.head, fontSize: 20, color: colors.text, textTransform: 'capitalize' },
  exerciseMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  table: {
    backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.sm, gap: 2,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  tableHeader: { flexDirection: 'row', gap: 8, paddingHorizontal: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableHeaderText: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.muted, letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 6 },
  setNumber: { width: 40, fontFamily: fonts.headBold, fontSize: 13, color: colors.text, textAlign: 'center' },
  readValue: { width: 70, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, textAlign: 'center' },
  rpeValue: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted, textAlign: 'right' },
  });
}
