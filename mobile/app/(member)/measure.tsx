import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useBodyMetrics, useCreateBodyMetric } from '../../src/hooks/useProgress';
import { Banner } from '../../src/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { haptics } from '../../src/utils/haptics';
import { Button } from '../../src/components/Button';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';

type MeasureType = 'weight' | 'waist' | 'bodyFat';

const TYPES: { value: MeasureType; label: string; unit: string; icon: keyof typeof MaterialIcons.glyphMap; min: number; max: number; step: number; start: number }[] = [
  { value: 'weight', get label() { return i18n.t('member.poids'); }, unit: 'kg', icon: 'monitor-weight', min: 30, max: 250, step: 0.1, start: 70 },
  { value: 'waist', get label() { return i18n.t('member.taille'); }, unit: 'cm', icon: 'straighten', min: 40, max: 200, step: 0.5, start: 80 },
  { value: 'bodyFat', get label() { return i18n.t('member.masse_grasse'); }, unit: '%', icon: 'percent', min: 3, max: 60, step: 0.1, start: 20 },
];

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => String(round1(n)).replace('.', ',');

/** Saisie d’une mesure — FitZone App Entraînement.dc.html, F2.
 * Présentée en bottom-sheet modale par-dessus l’écran Progression, comme la maquette. */
export default function MeasureScreen() {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: metrics } = useBodyMetrics();
  const createMetric = useCreateBodyMetric();
  const [isToday, setIsToday] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dernière valeur connue de chaque mesure (les enregistrements peuvent n'en contenir qu'une partie).
  const last = useMemo(() => {
    const out: Record<MeasureType, string> = { weight: '', waist: '', bodyFat: '' };
    for (const m of metrics ?? []) {
      if (!out.weight && m.weightKg) out.weight = String(Number(m.weightKg));
      for (const k of ['waist', 'bodyFat'] as const) if (!out[k] && m.measurements?.[k] != null) out[k] = String(m.measurements[k]);
    }
    return out;
  }, [metrics]);

  // Champs préremplis avec les dernières mesures ; seules les valeurs modifiées par l'utilisateur l'emportent.
  const [edited, setEdited] = useState<Partial<Record<MeasureType, string>>>({});
  const valueOf = (t: MeasureType) => edited[t] ?? last[t];

  const selectedDate = new Date();
  if (!isToday) selectedDate.setDate(selectedDate.getDate() - 1);

  const stepValue = (cfg: (typeof TYPES)[number], dir: 1 | -1) => {
    const current = Number(valueOf(cfg.value).replace(',', '.'));
    const base = Number.isFinite(current) && current > 0 ? current : cfg.start;
    const next = Math.min(cfg.max, Math.max(cfg.min, round1(base + dir * cfg.step)));
    haptics.selection();
    setEdited((e) => ({ ...e, [cfg.value]: String(next) }));
    setError(null);
  };
  const deltaOf = (cfg: (typeof TYPES)[number]) => {
    const now = Number(valueOf(cfg.value).replace(',', '.'));
    const before = Number(last[cfg.value]);
    if (!now || !before || edited[cfg.value] === undefined) return null;
    const d = round1(now - before);
    return d === 0 ? null : d;
  };

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

            <View style={styles.grid}>
              {TYPES.map((cfg) => {
                const delta = deltaOf(cfg);
                const changed = edited[cfg.value] !== undefined && edited[cfg.value] !== last[cfg.value];
                return (
                  <View key={cfg.value} style={[styles.card, changed && styles.cardChanged]}>
                    <View style={styles.cardTop}>
                      <View style={styles.fieldIcon}>
                        <MaterialIcons name={cfg.icon} size={18} color="#FFFFFF" />
                      </View>
                      {delta !== null ? (
                        <View style={[styles.deltaPill, { backgroundColor: delta < 0 ? colors.successSoft : colors.warningSoft }]}>
                          <MaterialIcons name={delta < 0 ? 'arrow-downward' : 'arrow-upward'} size={11} color={delta < 0 ? colors.successInk : colors.warningInk} />
                          <Text style={[styles.deltaText, { color: delta < 0 ? colors.successInk : colors.warningInk }]}>{fmt(Math.abs(delta))}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.fieldLabel} numberOfLines={1}>{cfg.label}</Text>
                    <Text style={styles.fieldPrev} numberOfLines={1}>
                      {last[cfg.value] ? i18n.t('member.measure_prev', { value: last[cfg.value], unit: cfg.unit }) : ' '}
                    </Text>
                    <View style={styles.stepper}>
                      <Pressable style={styles.stepBtn} onPress={() => stepValue(cfg, -1)} hitSlop={6} accessibilityLabel={cfg.label}>
                        <MaterialIcons name="remove" size={20} color={colors.text} />
                      </Pressable>
                      <View style={styles.valueBox}>
                        <TextInput
                          value={valueOf(cfg.value)}
                          onChangeText={(v) => { setEdited((e) => ({ ...e, [cfg.value]: v })); setError(null); }}
                          keyboardType="decimal-pad"
                          placeholder="—"
                          placeholderTextColor={colors.muted}
                          selectTextOnFocus
                          style={styles.fieldInput}
                        />
                        <Text style={styles.unit}>{cfg.unit}</Text>
                      </View>
                      <Pressable style={styles.stepBtnPlus} onPress={() => stepValue(cfg, 1)} hitSlop={6} accessibilityLabel={cfg.label}>
                        <MaterialIcons name="add" size={20} color={colors.primaryInk} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.dateBlock}>
              <Text style={styles.dateTitle}>{i18n.t('member.date_de_la_mesure')}</Text>
              <View style={styles.dateChips}>
                {([[true, i18n.t('member.aujourdhui')], [false, i18n.t('member.hier')]] as const).map(([today, label]) => {
                  const active = isToday === today;
                  return (
                    <Pressable key={label} style={styles.dateChip} onPress={() => setIsToday(today)}>
                      {active ? <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
                      <MaterialIcons name={today ? 'today' : 'history'} size={16} color={active ? colors.primaryContrast : colors.muted} />
                      <Text style={[styles.dateChipText, active && { color: colors.primaryContrast }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.tipRow}>
              <MaterialIcons name="lightbulb" size={16} color={colors.muted} />
              <Text style={styles.tipText}>{i18n.t('member.conseil_mesurez_vous_le_matin')}</Text>
            </View>

            <Button label={createMetric.isPending ? i18n.t('common.enregistrement') : i18n.t('member.enregistrer')} onPress={handleSave} loading={createMetric.isPending} />
          </ScrollView>
        </View>
      </SafeAreaView>

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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48.4%', flexGrow: 1, padding: 12, gap: 2, borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  cardChanged: { borderColor: colors.deep },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginBottom: 4 },
  fieldIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.deep },
  deltaPill: { flexDirection: 'row', alignItems: 'center', gap: 1, height: 22, paddingHorizontal: 6, borderRadius: 11 },
  deltaText: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  fieldPrev: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  stepBtnPlus: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  valueBox: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 2 },
  fieldInput: { minWidth: 44, paddingVertical: 0, paddingHorizontal: 0, textAlign: 'center', fontFamily: fonts.head, fontSize: 22, letterSpacing: -0.5, color: colors.text },
  unit: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  dateBlock: { gap: 8 },
  dateTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
  dateChips: { flexDirection: 'row', gap: 8 },
  dateChip: {
    flex: 1, height: 44, borderRadius: radii.sm, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  dateChipText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.text },
  helpText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, flex: 1 },
  });
}
