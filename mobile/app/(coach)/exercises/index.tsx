import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useEquipmentOptions, useExercises } from '../../../src/hooks/useCoaching';
import { EmptyState, SkeletonBlock } from '../../../src/components/ui';
import { ExerciseListItem } from '../../../src/components/training/ExerciseListItem';
import { MuscleGroupPickerSheet } from '../../../src/components/training/MuscleGroupPickerSheet';
import { GroupedFilterSheet, type FilterGroup } from '../../../src/components/training/GroupedFilterSheet';
import { EQUIPMENT_CATEGORIES, equipmentOptionsByCategory } from '../../../src/constants/equipment';

/** Bibliothèque d'exercices — variante coach : le retour se fait vers le
 * composeur de programme de l'élève sélectionné. Même filtre muscle
 * (silhouette, affichée dès l'accès à la page) et équipement (liste groupée)
 * que la bibliothèque adhérent. */
export default function CoachExercisesLibraryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { pickFor, studentId, studentName } = useLocalSearchParams<{ pickFor?: string; studentId?: string; studentName?: string }>();
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [bodyMapVisible, setBodyMapVisible] = useState(true);
  const [equipmentSheetVisible, setEquipmentSheetVisible] = useState(false);
  const { data: availableEquipment } = useEquipmentOptions();
  const { data: exercises, isLoading } = useExercises({
    search: search || undefined,
    muscleGroup: muscleGroup ? [muscleGroup] : undefined,
    equipment: equipment.length ? equipment : undefined,
  });

  const equipmentFilterGroups: FilterGroup[] = useMemo(() => {
    const byCategory = equipmentOptionsByCategory(availableEquipment ?? []);
    return EQUIPMENT_CATEGORIES.filter((c) => byCategory.has(c.value)).map((c) => ({
      key: c.value,
      label: c.label,
      options: byCategory.get(c.value)!,
    }));
  }, [availableEquipment]);

  const handlePress = (exerciseId: string) => {
    router.push({
      pathname: '/(coach)/exercises/configure',
      params: { exerciseId, dayIndex: pickFor, studentId, studentName },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title="Bibliothèque"
        fallbackHref={`/(coach)/program-builder?studentId=${studentId}&studentName=${studentName}`}
      />
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un exercice"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        <FilterButton
          icon="accessibility-new"
          label="Muscle"
          count={muscleGroup ? 1 : 0}
          onPress={() => setBodyMapVisible(true)}
        />
        <FilterButton
          icon="fitness-center"
          label="Équipement"
          count={equipment.length}
          onPress={() => setEquipmentSheetVisible(true)}
        />
      </View>

      <MuscleGroupPickerSheet
        visible={bodyMapVisible}
        value={muscleGroup}
        onClose={() => setBodyMapVisible(false)}
        onApply={setMuscleGroup}
      />
      <GroupedFilterSheet
        visible={equipmentSheetVisible}
        title="Filtrer par équipement"
        groups={equipmentFilterGroups}
        selected={equipment}
        onClose={() => setEquipmentSheetVisible(false)}
        onApply={setEquipment}
      />

      {isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} height={68} />
          ))}
        </View>
      ) : (
        <FlatList
          data={exercises ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ExerciseListItem
              name={item.name}
              muscleGroup={item.muscleGroup}
              mediaKey={item.mediaKey}
              onPress={() => handlePress(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState icon="search-off" title="Aucun résultat" text="Vérifiez l'orthographe ou essayez un autre filtre." tone="muted" />
          }
        />
      )}
    </SafeAreaView>
  );
}

function FilterButton({
  icon,
  label,
  count,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  count: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const active = count > 0;
  return (
    <Pressable style={[styles.filterButton, active && styles.filterButtonActive]} onPress={onPress}>
      <MaterialIcons name={icon} size={18} color={active ? colors.primaryContrast : colors.text} />
      <Text style={[styles.filterButtonLabel, active && styles.filterButtonLabelActive]}>
        {label}
        {active ? ` (${count})` : ''}
      </Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    searchWrap: { position: 'relative', flex: 1 },
    searchIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
    searchInput: {
      height: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      paddingLeft: 40, paddingRight: 14, fontFamily: fonts.body, fontSize: 14, color: colors.text,
    },
    filterRow: {
      flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
      marginBottom: spacing.sm,
    },
    filterButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
      borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    },
    filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterButtonLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    filterButtonLabelActive: { color: colors.primaryContrast },
    list: { flexGrow: 1, padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120, alignItems: 'stretch', justifyContent: 'flex-start' },
  });
}
