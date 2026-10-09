import { useMemo, useState } from 'react';
import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../ui';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { BodyMuscleMap } from './BodyMuscleMap';
import { muscleGroupLabel, type BodyView } from '../../constants/muscleGroups';

interface MuscleGroupPickerSheetProps {
  visible: boolean;
  /** Groupe musculaire actif dans l'écran (filtre à un seul choix). */
  value: string | null;
  onClose: () => void;
  onApply: (value: string | null) => void;
}

/** Sélecteur de groupe musculaire par silhouette corporelle (face/dos),
 * affiché en bottom sheet. Tapoter une zone sélectionne ce groupe et ferme la
 * feuille ; "Effacer" retire le filtre. */
export function MuscleGroupPickerSheet({ visible, value, onClose, onApply }: MuscleGroupPickerSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [bodyView, setBodyView] = useState<BodyView>('front');

  const handleToggle = (zoneValue: string) => {
    // Fermer la feuille immédiatement après un tap qui vient de l'intérieur du
    // GestureDetector (silhouette) peut démonter le composant pendant que le
    // gestionnaire de gestes natif traite encore l'événement, ce qui fait
    // planter l'app. Reporter après la fin des interactions en cours règle ça.
    InteractionManager.runAfterInteractions(() => {
      onApply(value === zoneValue ? null : zoneValue);
      onClose();
    });
  };

  const setFront = () => setBodyView('front');
  const setBack = () => setBodyView('back');

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollEnabled={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Filtrer par groupe musculaire</Text>
        <Pressable onPress={() => onApply(null)}>
          <Text style={styles.clear}>Effacer</Text>
        </Pressable>
      </View>

      <View style={styles.switchTrack}>
        <Pressable
          style={[styles.switchSegment, bodyView === 'front' && styles.switchSegmentActive]}
          onPress={setFront}
        >
          <Text style={[styles.switchLabel, bodyView === 'front' && styles.switchLabelActive]}>Face</Text>
        </Pressable>
        <Pressable
          style={[styles.switchSegment, bodyView === 'back' && styles.switchSegmentActive]}
          onPress={setBack}
        >
          <Text style={[styles.switchLabel, bodyView === 'back' && styles.switchLabelActive]}>Dos</Text>
        </Pressable>
      </View>

      <BodyMuscleMap view={bodyView} selected={value ? [value] : []} onToggle={handleToggle} />

      <Text style={styles.hint}>{value ? muscleGroupLabel(value) : 'Touchez une zone pour filtrer'}</Text>
    </BottomSheet>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: fonts.headSemiBold, fontSize: 17, color: colors.text },
    clear: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
    switchTrack: {
      flexDirection: 'row',
      padding: 3,
      borderRadius: radii.sm,
      backgroundColor: colors.surface2,
      gap: 3,
      marginTop: spacing.sm,
    },
    switchSegment: {
      flex: 1,
      height: 38,
      borderRadius: radii.sm - 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    switchSegmentActive: {
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    switchLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.muted },
    switchLabelActive: { color: colors.text },
    hint: {
      textAlign: 'center',
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.muted,
      marginTop: spacing.xs,
      textTransform: 'capitalize',
    },
  });
}
