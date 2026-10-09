import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Body, { type ExtendedBodyPart } from 'react-native-body-highlighter';
import { useTheme } from '../../theme/ThemeContext';
import type { BodyView } from '../../constants/muscleGroups';
import { MUSCLE_GROUP_TO_SLUG, SLUG_TO_MUSCLE_GROUP } from './bodyHighlighterMapping';

const SLIDE_DISTANCE = 24;

interface BodyMuscleMapProps {
  view: BodyView;
  selected: string[];
  onToggle: (value: string) => void;
}

/** Illustration anatomique (face/dos) via `react-native-body-highlighter` :
 * tracés réels par groupe musculaire (dont trapèze et avant-bras), chaque
 * zone change de couleur au tap sans image de fond ni calibration d'overlay.
 *
 * Pas de swipe pour changer de vue : le tap sur un muscle passe par le
 * `onPress` natif de `react-native-svg`, et tout `GestureDetector`
 * (react-native-gesture-handler) placé dans le même arbre de vues — même en
 * bordure, à côté de la silhouette plutôt que par-dessus — fait planter
 * l'app (deux systèmes tactiles distincts qui se disputent la même zone).
 * Le changement de vue passe uniquement par le switch Face/Dos dans
 * MuscleGroupPickerSheet. */
export function BodyMuscleMap({ view, selected, onToggle }: BodyMuscleMapProps) {
  const { colors } = useTheme();
  const slide = useMemo(() => new Animated.Value(0), []);
  const opacity = useMemo(() => new Animated.Value(1), []);
  const previousView = useRef(view);

  useEffect(() => {
    if (previousView.current === view) return;
    const direction = previousView.current === 'front' ? -1 : 1;
    previousView.current = view;
    slide.setValue(direction * SLIDE_DISTANCE);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [view, slide, opacity]);

  const data: ExtendedBodyPart[] = selected
    .map((value) => MUSCLE_GROUP_TO_SLUG[value])
    .filter((slug): slug is NonNullable<typeof slug> => !!slug)
    .map((slug) => ({ slug, color: colors.primary }));

  const handlePress = (bodyPart: ExtendedBodyPart) => {
    if (!bodyPart.slug) return;
    const muscleGroup = SLUG_TO_MUSCLE_GROUP[bodyPart.slug];
    if (muscleGroup) onToggle(muscleGroup);
  };

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ opacity, transform: [{ translateX: slide }] }}>
        <Body
          data={data}
          onBodyPartPress={handlePress}
          side={view}
          gender="male"
          scale={1.1}
          border={colors.border}
          defaultFill={colors.borderStrong}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
