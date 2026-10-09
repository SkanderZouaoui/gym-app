import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useBodyMetrics, useCreateBodyMetric } from '../../src/hooks/useProgress';
import { Banner, BottomSheet } from '../../src/components/ui';
import { Button } from '../../src/components/Button';

type MeasureType = 'weight' | 'waist' | 'arm' | 'bodyFat';

const TYPES: { value: MeasureType; label: string; unit: string; icon: keyof typeof MaterialIcons.glyphMap; min: number; max: number }[] = [
  { value: 'weight', label: 'Poids', unit: 'kg', icon: 'monitor-weight', min: 30, max: 250 },
  { value: 'waist', label: 'Taille', unit: 'cm', icon: 'straighten', min: 40, max: 200 },
  { value: 'arm', label: 'Bras', unit: 'cm', icon: 'fitness-center', min: 15, max: 70 },
  { value: 'bodyFat', label: 'Masse grasse', unit: '%', icon: 'percent', min: 3, max: 60 },
];

function formatDateLabel(date: Date, isToday: boolean) {
  const formatted = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return isToday ? `Aujourd’hui, ${formatted}` : `Hier, ${formatted}`;
}

/** Saisie d’une mesure — FitZone App Entraînement.dc.html, F2.
 * Présentée en bottom-sheet modale par-dessus l’écran Progression, comme la maquette. */
export default function MeasureScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: metrics } = useBodyMetrics();
  const createMetric = useCreateBodyMetric();
  const [type, setType] = useState<MeasureType>('weight');
  const [value, setValue] = useState('');
  const [isToday, setIsToday] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = TYPES.find((t) => t.value === type)!;
  const lastMetric = metrics?.find((m) => (type === 'weight' ? m.weightKg : m.measurements?.[type]));
  const lastValue = type === 'weight' ? lastMetric?.weightKg : lastMetric?.measurements?.[type];

  const selectedDate = new Date();
  if (!isToday) selectedDate.setDate(selectedDate.getDate() - 1);

  const handleClose = () => router.navigate('/(member)/(tabs)/training');

  const handleSave = () => {
    const num = Number(value.replace(',', '.'));
    if (!num || num < config.min || num > config.max) {
      setError(`Valeur hors plage : ${config.min} à ${config.max} ${config.unit}.`);
      return;
    }
    setError(null);
    createMetric.mutate(
      {
        date: selectedDate.toISOString(),
        ...(type === 'weight' ? { weightKg: num } : { measurements: { [type]: num } }),
      },
      { onSuccess: () => router.navigate('/(member)/(tabs)/training') },
    );
  };

  return (
    <View style={styles.overlayRoot}>
      <Pressable style={styles.overlay} onPress={handleClose} />
      <SafeAreaView style={styles.sheetSafeArea} edges={['bottom']}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Nouvelle mesure</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.typeGrid}>
              {TYPES.map((t) => (
                <Pressable key={t.value} style={[styles.typeChip, type === t.value && styles.typeChipActive]} onPress={() => { setType(t.value); setValue(''); setError(null); }}>
                  <MaterialIcons name={t.icon} size={20} color={type === t.value ? colors.onSecondary : colors.text} />
                  <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            {error ? <Banner tone="danger" icon="error" text={error} /> : null}

            <Text style={styles.fieldLabel}>{config.label} ({config.unit})</Text>
            <View style={styles.valueRow}>
              <TextInput
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.muted}
                style={[styles.valueInput, error && styles.valueInputError]}
              />
              <Text style={styles.unit}>{config.unit}</Text>
            </View>

            {lastValue ? <Text style={styles.helpText}>Dernière mesure : {lastValue} {config.unit}</Text> : null}

            <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="calendar-today" size={16} color={colors.text} />
              <Text style={styles.dateText}>{formatDateLabel(selectedDate, isToday)}</Text>
              <MaterialIcons name="expand-more" size={18} color={colors.muted} />
            </Pressable>

            <View style={styles.tipRow}>
              <MaterialIcons name="lightbulb" size={16} color={colors.muted} />
              <Text style={styles.tipText}>Conseil : mesurez-vous le matin, dans les mêmes conditions.</Text>
            </View>

            <Button label={createMetric.isPending ? 'Enregistrement…' : 'Enregistrer'} onPress={handleSave} loading={createMetric.isPending} />
          </View>
        </View>
      </SafeAreaView>

      <BottomSheet visible={showDatePicker} onClose={() => setShowDatePicker(false)}>
        <Text style={styles.pickerTitle}>Date de la mesure</Text>
        <Pressable style={styles.pickerOption} onPress={() => { setIsToday(true); setShowDatePicker(false); }}>
          <Text style={styles.pickerOptionText}>Aujourd’hui</Text>
          {isToday ? <MaterialIcons name="check" size={18} color={colors.primaryInk} /> : null}
        </Pressable>
        <Pressable style={styles.pickerOption} onPress={() => { setIsToday(false); setShowDatePicker(false); }}>
          <Text style={styles.pickerOptionText}>Hier</Text>
          {!isToday ? <MaterialIcons name="check" size={18} color={colors.primaryInk} /> : null}
        </Pressable>
      </BottomSheet>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  overlayRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,17,23,0.45)' },
  sheetSafeArea: { backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  sheet: { paddingTop: 10 },
  handle: { width: 40, height: 5, borderRadius: 999, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.headSemiBold, fontSize: 19, color: colors.text },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 42,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  typeChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  typeChipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  typeChipTextActive: { color: colors.onSecondary },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueInput: {
    flex: 1, height: 64, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.borderStrong,
    paddingHorizontal: 16, fontFamily: fonts.head, fontSize: 32, color: colors.text, backgroundColor: colors.surface,
  },
  valueInputError: { borderColor: colors.danger },
  unit: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.muted },
  helpText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14,
    borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignSelf: 'flex-start',
  },
  dateText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.text },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, flex: 1 },
  pickerTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text, marginBottom: spacing.sm },
  pickerOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 48,
    paddingHorizontal: spacing.sm,
  },
  pickerOptionText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  });
}
