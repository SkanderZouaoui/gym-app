import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useBodyMetrics, useCreateBodyMetric } from '../../src/hooks/useProgress';
import { Banner, BottomSheet } from '../../src/components/ui';
import { Button } from '../../src/components/Button';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../src/i18n';

type MeasureType = 'weight' | 'waist' | 'arm' | 'bodyFat';

const TYPES: { value: MeasureType; label: string; unit: string; icon: keyof typeof MaterialIcons.glyphMap; min: number; max: number }[] = [
  { value: 'weight', get label() { return i18n.t('member.poids'); }, unit: 'kg', icon: 'monitor-weight', min: 30, max: 250 },
  { value: 'waist', get label() { return i18n.t('member.taille'); }, unit: 'cm', icon: 'straighten', min: 40, max: 200 },
  { value: 'arm', get label() { return i18n.t('member.bras'); }, unit: 'cm', icon: 'fitness-center', min: 15, max: 70 },
  { value: 'bodyFat', get label() { return i18n.t('member.masse_grasse'); }, unit: '%', icon: 'percent', min: 3, max: 60 },
];

function formatDateLabel(date: Date, isToday: boolean) {
  const formatted = date.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' });
  return i18n.t(isToday ? 'member.today_date' : 'member.yesterday_date', { date: formatted });
}

/** Saisie d’une mesure — FitZone App Entraînement.dc.html, F2.
 * Présentée en bottom-sheet modale par-dessus l’écran Progression, comme la maquette. */
export default function MeasureScreen() {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: metrics } = useBodyMetrics();
  const createMetric = useCreateBodyMetric();
  const [isToday, setIsToday] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dernière valeur connue de chaque mesure (les enregistrements peuvent n'en contenir qu'une partie).
  const last = useMemo(() => {
    const out: Record<MeasureType, string> = { weight: '', waist: '', arm: '', bodyFat: '' };
    for (const m of metrics ?? []) {
      if (!out.weight && m.weightKg) out.weight = String(Number(m.weightKg));
      for (const k of ['waist', 'arm', 'bodyFat'] as const) if (!out[k] && m.measurements?.[k] != null) out[k] = String(m.measurements[k]);
    }
    return out;
  }, [metrics]);

  // Champs préremplis avec les dernières mesures ; seules les valeurs modifiées par l'utilisateur l'emportent.
  const [edited, setEdited] = useState<Partial<Record<MeasureType, string>>>({});
  const valueOf = (t: MeasureType) => edited[t] ?? last[t];

  const selectedDate = new Date();
  if (!isToday) selectedDate.setDate(selectedDate.getDate() - 1);

  const handleClose = () => router.navigate('/(member)/(tabs)/progress');

  const handleSave = () => {
    const parsed: Partial<Record<MeasureType, number>> = {};
    for (const cfg of TYPES) {
      const raw = valueOf(cfg.value).trim();
      if (!raw) continue;
      const num = Number(raw.replace(',', '.'));
      if (!num || num < cfg.min || num > cfg.max) {
        setError(i18n.t('member.valeur_hors_plage_a', { min: cfg.min, max: cfg.max, unit: cfg.unit }) + ` (${cfg.label})`);
        return;
      }
      parsed[cfg.value] = num;
    }
    if (Object.keys(parsed).length === 0) {
      setError(i18n.t('member.measure_need_one'));
      return;
    }
    setError(null);
    // Toutes les valeurs (modifiées ou reprises) sont enregistrées ensemble : les mesures non touchées ne repartent pas de zéro.
    const { weight, ...rest } = parsed;
    createMetric.mutate(
      {
        date: selectedDate.toISOString(),
        ...(weight !== undefined ? { weightKg: weight } : {}),
        ...(Object.keys(rest).length ? { measurements: rest as Record<string, number> } : {}),
      },
      { onSuccess: () => router.navigate('/(member)/(tabs)/progress') },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.overlayRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.overlay} onPress={handleClose} />
      <SafeAreaView style={styles.sheetSafeArea} edges={['bottom']}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('member.nouvelle_mesure')}</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.7 }}>
            <Text style={styles.helpText}>{i18n.t('member.measure_hint_keep')}</Text>

            {error ? <Banner tone="danger" icon="error" text={error} /> : null}

            <View style={styles.fields}>
              {TYPES.map((cfg) => {
                const value = valueOf(cfg.value);
                const changed = edited[cfg.value] !== undefined && edited[cfg.value] !== last[cfg.value];
                return (
                  <View key={cfg.value} style={[styles.field, changed && styles.fieldChanged]}>
                    <View style={styles.fieldIcon}>
                      <MaterialIcons name={cfg.icon} size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.fieldLabel}>{cfg.label}</Text>
                      {last[cfg.value] ? <Text style={styles.fieldPrev}>{i18n.t('member.measure_prev', { value: last[cfg.value], unit: cfg.unit })}</Text> : null}
                    </View>
                    <TextInput
                      value={value}
                      onChangeText={(v) => { setEdited((e) => ({ ...e, [cfg.value]: v })); setError(null); }}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      placeholderTextColor={colors.muted}
                      selectTextOnFocus
                      style={styles.fieldInput}
                    />
                    <Text style={styles.unit}>{cfg.unit}</Text>
                  </View>
                );
              })}
            </View>

            <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="calendar-today" size={16} color={colors.text} />
              <Text style={styles.dateText}>{formatDateLabel(selectedDate, isToday)}</Text>
              <MaterialIcons name="expand-more" size={18} color={colors.muted} />
            </Pressable>

            <View style={styles.tipRow}>
              <MaterialIcons name="lightbulb" size={16} color={colors.muted} />
              <Text style={styles.tipText}>{i18n.t('member.conseil_mesurez_vous_le_matin')}</Text>
            </View>

            <Button label={createMetric.isPending ? i18n.t('common.enregistrement') : i18n.t('member.enregistrer')} onPress={handleSave} loading={createMetric.isPending} />
          </ScrollView>
        </View>
      </SafeAreaView>

      <BottomSheet visible={showDatePicker} onClose={() => setShowDatePicker(false)}>
        <Text style={styles.pickerTitle}>{i18n.t('member.date_de_la_mesure')}</Text>
        <Pressable style={styles.pickerOption} onPress={() => { setIsToday(true); setShowDatePicker(false); }}>
          <Text style={styles.pickerOptionText}>{i18n.t('member.aujourdhui')}</Text>
          {isToday ? <MaterialIcons name="check" size={18} color={colors.primaryInk} /> : null}
        </Pressable>
        <Pressable style={styles.pickerOption} onPress={() => { setIsToday(false); setShowDatePicker(false); }}>
          <Text style={styles.pickerOptionText}>{i18n.t('member.hier')}</Text>
          {!isToday ? <MaterialIcons name="check" size={18} color={colors.primaryInk} /> : null}
        </Pressable>
      </BottomSheet>
    </KeyboardAvoidingView>
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
  fields: { gap: 10 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  fieldChanged: { borderColor: colors.deep },
  fieldIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.deep },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  fieldPrev: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
  fieldInput: { minWidth: 70, maxWidth: 110, height: 46, textAlign: 'right', fontFamily: fonts.head, fontSize: 24, color: colors.text, paddingHorizontal: 4 },
  unit: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted, width: 24 },
  helpText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
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
