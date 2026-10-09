import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, spacing } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useMyPrograms } from '../../../hooks/useCoaching';
import { EmptyState } from '../../ui';
import { ProgramCard } from '../ProgramCard';

const DAY_LABELS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Vue "Programmes" de l'onglet Entraînement — FitZone App Entraînement.dc.html, D1. */
export function ProgramsView() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: programs, isLoading } = useMyPrograms();

  if (isLoading) return null;

  if (!programs || programs.length === 0) {
    return (
      <View style={{ gap: spacing.sm }}>
        <EmptyState
          icon="fitness-center"
          title="Pas encore de programme"
          text="Demandez un programme à un coach ou créez le vôtre à partir de la bibliothèque d'exercices."
          tone="primary"
        />
        <Pressable style={styles.createButton} onPress={() => router.push('/(member)/program-builder')}>
          <Text style={styles.createButtonText}>+ Créer un programme</Text>
        </Pressable>
      </View>
    );
  }

  const today = new Date().getDay();
  const [main, ...others] = programs;
  const todayDay = main.days.find((d) => d.dayOfWeek === today) ?? main.days[0];

  return (
    <View style={{ gap: spacing.sm }}>
      <ProgramCard
        highlighted
        name={main.name}
        isOwn={main.createdById === main.assignedToId}
        dayCount={main.days.length}
        todayLabel={todayDay ? todayDay.label ?? DAY_LABELS_FR[todayDay.dayOfWeek] : undefined}
        todayExerciseCount={todayDay?.exercises.length}
        onPress={() => router.push(`/(member)/program/${main.id}`)}
        onStart={todayDay ? () => router.push(`/(member)/session/live/${main.id}/${todayDay.id}`) : undefined}
      />

      {others.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>AUTRES PROGRAMMES</Text>
          {others.map((p) => (
            <ProgramCard
              key={p.id}
              name={p.name}
              isOwn={p.createdById === p.assignedToId}
              dayCount={p.days.length}
              onPress={() => router.push(`/(member)/program/${p.id}`)}
            />
          ))}
        </>
      ) : null}

      <Pressable style={styles.createButtonOutline} onPress={() => router.push('/(member)/program-builder')}>
        <Text style={styles.createButtonOutlineText}>+ Créer un programme</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    sectionLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.5, color: colors.muted, marginTop: spacing.sm },
    createButton: {
      height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    createButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
    createButtonOutline: {
      height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
      alignItems: 'center', justifyContent: 'center',
    },
    createButtonOutlineText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  });
}
