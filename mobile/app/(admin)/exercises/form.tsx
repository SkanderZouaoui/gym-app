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
import { useTranslation } from 'react-i18next';
import i18n from '../../../src/i18n';
import { levelLabel } from '../../../src/i18n/labels';

const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];
const TYPES = [
  { value: 'STRENGTH', get label() { return i18n.t('admin.force'); } },
  { value: 'CARDIO', get label() { return i18n.t('common.cardio'); } },
  { value: 'MOBILITY', get label() { return i18n.t('admin.mobilite'); } },
] as const;

/** Création / modification d'un exercice de la bibliothèque. */
export default function AdminExerciseFormScreen() {
  useTranslation();
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
    setLevel(existing.level ?? i18n.t('admin.debutant'));
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
      { onSuccess: goBack, onError: () => setError(i18n.t('admin.impossible_denregistrer_lexercice_reessayez')) },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: STICKY_BAR_SPACE + 30 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{i18n.t('common.retour')}</Text>
        </Pressable>
        <ScreenTitle title={editing ? i18n.t('admin.modifier_lexercice') : i18n.t('admin.nouvel_exercice')} subtitle={i18n.t('admin.bibliotheque_dexercices_2')} />
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <TextField label={i18n.t('admin.nom_de_lexercice')} value={name} onChangeText={setName} placeholder={i18n.t('admin.ex_developpe_couche')} autoCapitalize="sentences" />

        <SelectField
          label={i18n.t('admin.groupe_musculaire')}
          icon="fitness-center"
          placeholder={i18n.t('admin.choisir_un_groupe')}
          value={muscleGroup}
          options={groups.map((g) => ({ value: g, label: muscleGroupLabel(g) }))}
          onChange={setMuscleGroup}
          create={{
            label: i18n.t('admin.nouveau_groupe_musculaire'),
            placeholder: i18n.t('admin.ex_epaules'),
            submit: async (n) => {
              setExtraGroups((cur) => [...cur, n]);
              return n;
            },
          }}
        />
        <SelectField
          label={i18n.t('common.equipement')}
          icon="construction"
          placeholder={i18n.t('admin.aucun_poids_du_corps')}
          value={equipment}
          options={[{ value: null, label: i18n.t('admin.aucun_poids_du_corps') }, ...equipments.map((e) => ({ value: e, label: e }))]}
          onChange={setEquipment}
          create={{
            label: i18n.t('admin.nouvel_equipement'),
            placeholder: i18n.t('admin.ex_kettlebell'),
            submit: async (n) => {
              setExtraEquip((cur) => [...cur, n]);
              return n;
            },
          }}
        />

        <Text style={styles.label}>{i18n.t('common.niveau')}</Text>
        <View style={styles.chips}>
          {LEVELS.map((l) => (
            <Pressable key={l} onPress={() => setLevel(l)} style={[styles.chip, level === l && styles.chipOn]}>
              <Text style={[styles.chipText, level === l && { color: colors.primaryContrast }]}>{levelLabel(l)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{i18n.t('admin.type')}</Text>
        <View style={styles.chips}>
          {TYPES.map((t) => (
            <Pressable key={t.value} onPress={() => setType(t.value)} style={[styles.chip, type === t.value && styles.chipOn]}>
              <Text style={[styles.chipText, type === t.value && { color: colors.primaryContrast }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <TextField
          label={i18n.t('admin.execution_une_etape_par_ligne')}
          value={instructions}
          onChangeText={setInstructions}
          placeholder={i18n.t('admin.allongez_vous_sur_le_banc')}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
      </ScrollView>
      <StickyActionBar visible label={editing ? i18n.t('member.enregistrer') : i18n.t('admin.ajouter_lexercice')} loading={save.isPending} disabled={!valid} onPress={submit} />
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
