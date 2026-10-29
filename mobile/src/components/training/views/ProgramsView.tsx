import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useMyPrograms, useProposedPrograms } from '../../../hooks/useCoaching';
import { EmptyState } from '../../ui';
import { ProgramCard } from '../ProgramCard';

const DAY_LABELS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Vue « Mes programmes » de l'onglet Entraînement : programme à la une en dégradé, bouton
 * pointillé de création, puis les autres programmes (assignés par le coach ou personnels). */
export function ProgramsView({ source = 'mine' }: { source?: 'mine' | 'proposed' }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mine = useMyPrograms();
  const proposed = useProposedPrograms();
  const { data: programs, isLoading, isError, refetch } = source === 'proposed' ? proposed : mine;

  if (isLoading) return null;

  if (isError && !programs) {
    return (
      <EmptyState
        icon="cloud-off"
        title="Programmes indisponibles"
        text="Impossible de récupérer vos programmes pour le moment. Vérifiez votre connexion."
        tone="danger"
        actionLabel="Réessayer"
        onAction={() => refetch()}
      />
    );
  }

  const list = programs ?? [];
  const isOwn = (p: (typeof list)[number]) => p.createdById === p.assignedToId;
  const today = new Date().getDay();
  const [main, ...others] = list;
  const todayDay = main ? main.days.find((d) => d.dayOfWeek === today) ?? main.days[0] : undefined;

  const createButton = (
    <Pressable
      style={({ pressed }) => [styles.createButton, pressed && { transform: [{ scale: 0.98 }] }]}
      onPress={() => router.push('/(member)/program-builder')}
    >
      <MaterialIcons name="add" size={22} color={colors.primaryInk} />
      <Text style={styles.createButtonText}>Créer un programme</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.sm }}>
      {main ? (
        <ProgramCard
          highlighted
          kicker={source === 'proposed' ? 'RECOMMANDÉ POUR VOUS' : isOwn(main) ? 'MON PROGRAMME' : 'ASSIGNÉ PAR VOTRE COACH'}
          name={main.name}
          isOwn={isOwn(main)}
          proposed={source === 'proposed'}
          dayCount={main.days.length}
          todayLabel={todayDay ? todayDay.label ?? DAY_LABELS_FR[todayDay.dayOfWeek] : undefined}
          todayExerciseCount={todayDay?.exercises.length}
          onPress={() => router.push(`/(member)/program/${main.id}`)}
          onStart={() => router.push(`/(member)/program/${main.id}`)}
        />
      ) : source === 'proposed' ? (
        <EmptyState
          icon="auto-awesome"
          title="Aucun programme proposé"
          text="Les programmes validés par la salle apparaîtront ici."
          tone="primary"
        />
      ) : null}

      {source === 'mine' ? createButton : null}

      {others.map((p) => (
        <ProgramCard
          key={p.id}
          name={p.name}
          isOwn={isOwn(p)}
          proposed={source === 'proposed'}
          dayCount={p.days.length}
          onPress={() => router.push(`/(member)/program/${p.id}`)}
        />
      ))}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    createButton: {
      minHeight: 64, borderRadius: radii.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
      backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    createButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
  });
}
