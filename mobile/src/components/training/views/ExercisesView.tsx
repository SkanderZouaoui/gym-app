import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { fonts, radii, spacing } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useExercises } from '../../../hooks/useCoaching';
import { EmptyState } from '../../ui';
import { BodyMuscleMap } from '../BodyMuscleMap';
import { ExerciseGif } from '../ExerciseGif';
import { muscleGroupLabel, type BodyView } from '../../../constants/muscleGroups';

const SIDES: { value: BodyView; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'front', label: 'Face', icon: 'accessibility-new' },
  { value: 'back', label: 'Dos', icon: 'airline-seat-recline-normal' },
];

/** Segment « Exercices » de l'onglet Entraînement, intégré (maquette v2) : bascule Face / Dos,
 * silhouette anatomique de l'app (react-native-body-highlighter), puis grille des exercices
 * du groupe choisi avec leurs démonstrations. */
export function ExercisesView() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [side, setSide] = useState<BodyView>('front');
  const [group, setGroup] = useState<string | null>(null);

  return group ? (
    <ExerciseGrid group={group} onBack={() => setGroup(null)} />
  ) : (
    <View>
      <Text style={styles.heading}>Filtrer par groupe musculaire</Text>
      <SideToggle value={side} onChange={setSide} />
      <View style={[styles.bodyCard, cardShadow]}>
        <BodyMuscleMap view={side} selected={[]} onToggle={(g) => setGroup(g)} />
        <Text style={styles.hint}>Touchez une zone pour filtrer</Text>
      </View>
    </View>
  );
}

function SideToggle({ value, onChange }: { value: BodyView; onChange: (v: BodyView) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const thumbWidth = Math.max(0, (width - 8) / 2);

  // Synchronise la pastille avec la valeur (y compris au retour depuis la grille d'exercices).
  useEffect(() => {
    x.value = withTiming(value === 'front' ? 0 : thumbWidth, { duration: 160, easing: Easing.out(Easing.cubic) });
  }, [value, thumbWidth, x]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.toggle} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.thumb, { width: thumbWidth }, thumbStyle]}>
        <LinearGradient colors={[colors.primary, colors.primaryPressed]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {SIDES.map((s) => {
        const active = s.value === value;
        return (
          <Pressable key={s.value} style={styles.toggleItem} onPress={() => onChange(s.value)}>
            <MaterialIcons name={s.icon} size={22} color={active ? '#FFFFFF' : colors.muted} />
            <Text style={[styles.toggleLabel, { color: active ? '#FFFFFF' : colors.muted }]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ExerciseGrid({ group, onBack }: { group: string; onBack: () => void }) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: exercises, isLoading, isError, refetch } = useExercises({ muscleGroup: [group] });
  const { width } = useWindowDimensions();
  const mediaWidth = (width - spacing.lg * 2 - 10) / 2 - 30;
  const label = muscleGroupLabel(group);

  return (
    <View>
      <View style={styles.groupHeader}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Groupes</Text>
        </Pressable>
        <Text style={styles.groupName}>{label}</Text>
      </View>

      {isError ? (
        <EmptyState
          icon="cloud-off"
          title="Exercices indisponibles"
          text="Impossible de récupérer les exercices pour le moment."
          tone="danger"
          actionLabel="Réessayer"
          onAction={() => refetch()}
        />
      ) : !isLoading && (exercises ?? []).length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun exercice pour ce groupe.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {(exercises ?? []).map((e) => (
            <Pressable
              key={e.id}
              style={({ pressed }) => [styles.exCard, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push(`/(member)/exercises/${e.id}`)}
            >
              <View style={[styles.thumbBox, { width: mediaWidth }]}>
                <ExerciseGif uri={e.mediaKey} size={Math.min(mediaWidth, 110)} />
              </View>
              <View>
                <Text style={styles.exName} numberOfLines={2}>{e.name}</Text>
                <Text style={styles.exMeta} numberOfLines={1}>
                  {[label, e.equipment].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    heading: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: colors.text, marginTop: 14, marginBottom: 12 },
    toggle: {
      flexDirection: 'row', height: 52, borderRadius: 20, padding: 4,
      backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    thumb: {
      position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 16, overflow: 'hidden',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 8,
    },
    toggleItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 },
    toggleLabel: { fontFamily: fonts.bodyBold, fontSize: 15 },
    bodyCard: {
      marginTop: 12, paddingTop: 14, paddingBottom: 12, alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border,
    },
    hint: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginTop: 6 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    groupName: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    exCard: {
      width: '48.5%', padding: 14, gap: 10, backgroundColor: colors.surface, borderRadius: radii.lg,
      borderWidth: 1, borderColor: colors.border,
    },
    thumbBox: { height: 110, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surface2 },
    exName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, textTransform: 'capitalize' },
    exMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2, textTransform: 'capitalize' },
    empty: {
      marginTop: 12, padding: 28, borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed',
      borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center',
    },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  });
}
