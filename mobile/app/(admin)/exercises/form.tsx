import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { TextField } from '../../../src/components/TextField';
import { Banner, ScreenTitle } from '../../../src/components/ui';
import { SelectField } from '../../../src/components/ui/SelectField';
import { StickyActionBar, STICKY_BAR_SPACE } from '../../../src/components/ui/StickyActionBar';
import { muscleGroupLabel } from '../../../src/constants/muscleGroups';
import { useAdminExercise, useAdminExercises, useSaveExercise } from '../../../src/hooks/useAdmin';

const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];
const TYPES = [
  { value: 'STRENGTH', label: 'Force' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'MOBILITY', label: 'Mobilité' },
] as const;

/** Création / modification d'un exercice de la bibliothèque. */
export default function AdminExerciseFormScreen() {
  const { id, group } = useLocalSearchParams<{ id?: string; group?: string }>();
  const editing = !!id;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: existing } = useAdminExercise(id);
  const { data: all } = useAdminExercises();
  const save = useSaveExercise();

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(group ?? null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [level, setLevel] = useState<string>('Débutant');
  const [type, setType] = useState<'STRENGTH' | 'CARDIO' | 'MOBILITY'>('STRENGTH');
  const [instructions, setInstructions] = useState('');
  const [extraGroups, setExtraGroups] = useState<string[]>([]);
  const [extraEquip, setExtraEquip] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!existing || hydrated) return;
    setName(existing.name);
    setMuscleGroup(existing.muscleGroup);
    setEquipment(existing.equipment);
    setLevel(existing.level ?? 'Débutant');
    setType(existing.type);
    setInstructions(existing.instructions ?? '');
    setHydrated(true);
  }, [existing, hydrated]);

  const groups = useMemo(() => [...new Set([...(all ?? []).map((e) => e.muscleGroup).filter((g): g is string => !!g), ...extraGroups, ...(muscleGroup ? [muscleGroup] : [])])].sort((a, b) => a.localeCompare(b, 'fr')), [all, extraGroups, muscleGroup]);
  const equipments = useMemo(() => [...new Set([...(all ?? []).map((e) => e.equipment).filter((g): g is string => !!g), ...extraEquip, ...(equipment ? [equipment] : [])])].sort((a, b) => a.localeCompare(b, 'fr')), [all, extraEquip, equipment]);

  const valid = name.trim().length > 1 && !!muscleGroup;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/exercises'));

  const submit = () => {
    setError(null);
    save.mutate(
      { id, name: name.trim(), muscleGroup: muscleGroup ?? undefined, equipment: equipment ?? undefined, level, type, instructions: instructions.trim() || undefined },
      { onSuccess: goBack, onError: () => setError('Impossible d’enregistrer l’exercice. Réessayez.') },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: STICKY_BAR_SPACE + 30 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <ScreenTitle title={editing ? 'Modifier l’exercice' : 'Nouvel exercice'} subtitle="Bibliothèque d’exercices" />
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <TextField label="Nom de l’exercice" value={name} onChangeText={setName} placeholder="Ex. Développé couché" autoCapitalize="sentences" />

        <SelectField
          label="Groupe musculaire"
          icon="fitness-center"
          placeholder="Choisir un groupe"
          value={muscleGroup}
          options={groups.map((g) => ({ value: g, label: muscleGroupLabel(g) }))}
          onChange={setMuscleGroup}
          create={{
            label: 'Nouveau groupe musculaire',
            placeholder: 'Ex. Épaules',
            submit: async (n) => {
              setExtraGroups((cur) => [...cur, n]);
              return n;
            },
          }}
        />
        <SelectField
          label="Équipement"
          icon="construction"
          placeholder="Aucun / poids du corps"
          value={equipment}
          options={[{ value: null, label: 'Aucun / poids du corps' }, ...equipments.map((e) => ({ value: e, label: e }))]}
          onChange={setEquipment}
          create={{
            label: 'Nouvel équipement',
            placeholder: 'Ex. Kettlebell',
            submit: async (n) => {
              setExtraEquip((cur) => [...cur, n]);
              return n;
            },
          }}
        />

        <Text style={styles.label}>Niveau</Text>
        <View style={styles.chips}>
          {LEVELS.map((l) => (
            <Pressable key={l} onPress={() => setLevel(l)} style={[styles.chip, level === l && styles.chipOn]}>
              <Text style={[styles.chipText, level === l && { color: colors.primaryContrast }]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {TYPES.map((t) => (
            <Pressable key={t.value} onPress={() => setType(t.value)} style={[styles.chip, type === t.value && styles.chipOn]}>
              <Text style={[styles.chipText, type === t.value && { color: colors.primaryContrast }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <TextField
          label="Exécution (une étape par ligne)"
          value={instructions}
          onChangeText={setInstructions}
          placeholder={'Allongez-vous sur le banc.\nDescendez la barre jusqu’à la poitrine.\nPoussez sans verrouiller les coudes.'}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
      </ScrollView>
      <StickyActionBar visible label={editing ? 'Enregistrer' : 'Ajouter l’exercice'} loading={save.isPending} disabled={!valid} onPress={submit} />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: 12 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { height: 42, paddingHorizontal: 16, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  });
}
