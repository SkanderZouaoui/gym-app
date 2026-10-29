import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import {
  DEFAULT_ATTENDANCE_POLICY,
  useAttendancePolicy,
  useUpdateAttendancePolicy,
  type AttendancePolicy,
} from '../../src/hooks/useAdmin';
import { Banner, ScreenTitle } from '../../src/components/ui';

function Stepper({
  label, hint, value, unit, min = 0, max = 240, step = 5, onChange,
}: {
  label: string; hint?: string; value: number; unit: string; min?: number; max?: number; step?: number;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} hitSlop={6} onPress={() => onChange(Math.max(min, value - step))}>
          <MaterialIcons name="remove" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.stepValue}>{value} <Text style={styles.stepUnit}>{unit}</Text></Text>
        <Pressable style={styles.stepBtn} hitSlop={6} onPress={() => onChange(Math.min(max, value + step))}>
          <MaterialIcons name="add" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
    </View>
  );
}

/** Configuration (admin) : période de scan et règles de présence. */
export default function AdminSettingsScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data } = useAttendancePolicy();
  const update = useUpdateAttendancePolicy();
  const [policy, setPolicy] = useState<AttendancePolicy>(DEFAULT_ATTENDANCE_POLICY);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  useEffect(() => {
    if (data && !dirty) setPolicy(data);
  }, [data, dirty]);

  const patch = (p: Partial<AttendancePolicy>) => {
    setPolicy((cur) => ({ ...cur, ...p }));
    setDirty(true);
    setSaved(false);
  };
  const patchPenalty = (p: Partial<AttendancePolicy['noShowPenalty']>) =>
    patch({ noShowPenalty: { ...policy.noShowPenalty, ...p } });

  const save = () =>
    update.mutate(policy, {
      onSuccess: () => {
        setDirty(false);
        setSaved(true);
      },
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Plus</Text>
        </Pressable>
        <ScreenTitle title="Configuration" subtitle="Période de scan et règles de présence" />

        <Text style={styles.section}>Période de scan</Text>
        <View style={[styles.card, cardShadow]}>
          <Stepper
            label="Ouverture avant le cours"
            hint="Le pointage s’ouvre avant le début"
            value={policy.scanOpensMinutesBefore}
            unit="min"
            onChange={(v) => patch({ scanOpensMinutesBefore: v })}
          />
          <View style={styles.sep} />
          <Stepper
            label="Fermeture après le début"
            hint="Au-delà, le scan est refusé"
            value={policy.scanClosesMinutesAfterStart}
            unit="min"
            onChange={(v) => patch({ scanClosesMinutesAfterStart: v })}
          />
        </View>
        <Text style={styles.preview}>
          Exemple : pour un cours à 18:00, on peut pointer de {clock(18 * 60 - policy.scanOpensMinutesBefore)} à{' '}
          {clock(18 * 60 + policy.scanClosesMinutesAfterStart)}.
        </Text>

        <Text style={styles.section}>Présence</Text>
        <View style={[styles.card, cardShadow]}>
          <ToggleRow
            label="Accepter sans réservation"
            hint="Pointer un adhérent qui n’a pas réservé"
            value={policy.allowWalkIn}
            onChange={(v) => patch({ allowWalkIn: v })}
          />
          <View style={styles.sep} />
          <Stepper
            label="Délai avant absence"
            hint="Après le début, une réservation non pointée devient une absence"
            value={policy.noShowGraceMinutes}
            unit="min"
            onChange={(v) => patch({ noShowGraceMinutes: v })}
          />
          <View style={styles.sep} />
          <ToggleRow
            label="L’accueil peut encaisser"
            hint="Autoriser le personnel d’accueil à enregistrer des paiements"
            value={policy.staffCanRecordPayments}
            onChange={(v) => patch({ staffCanRecordPayments: v })}
          />
        </View>

        <Text style={styles.section}>Pénalité d’absence</Text>
        <View style={[styles.card, cardShadow]}>
          <ToggleRow
            label="Bloquer les réservations"
            hint="Après plusieurs absences, l’adhérent ne peut plus réserver un moment"
            value={policy.noShowPenalty.enabled}
            onChange={(v) => patchPenalty({ enabled: v })}
          />
          {policy.noShowPenalty.enabled ? (
            <>
              <View style={styles.sep} />
              <Stepper label="Nombre d’absences" value={policy.noShowPenalty.threshold} unit="abs." min={1} max={20} step={1} onChange={(v) => patchPenalty({ threshold: v })} />
              <View style={styles.sep} />
              <Stepper label="Sur une période de" value={policy.noShowPenalty.windowDays} unit="jours" min={1} max={365} step={5} onChange={(v) => patchPenalty({ windowDays: v })} />
              <View style={styles.sep} />
              <Stepper label="Blocage pendant" value={policy.noShowPenalty.blockBookingDays} unit="jours" min={1} max={90} step={1} onChange={(v) => patchPenalty({ blockBookingDays: v })} />
            </>
          ) : null}
        </View>

        {update.isError ? <Banner tone="danger" icon="error-outline" title="Enregistrement impossible" text="Vérifiez la connexion et réessayez." /> : null}
        {saved ? <Banner tone="success" icon="check-circle-outline" title="Configuration enregistrée" text="Les nouvelles règles s’appliquent immédiatement." /> : null}

        <Pressable onPress={save} disabled={!dirty || update.isPending} style={({ pressed }) => [(!dirty || update.isPending) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.98 }] }]}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.save}>
            <Text style={styles.saveText}>{update.isPending ? 'Enregistrement…' : 'Enregistrer'}</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function clock(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    section: { fontFamily: fonts.headSemiBold, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginTop: 4 },
    card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
    rowHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },
    sep: { height: 1, backgroundColor: colors.border },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface2, borderRadius: 14, padding: 4 },
    stepBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    stepValue: { minWidth: 62, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    stepUnit: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    preview: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginHorizontal: 4, marginTop: -4 },
    save: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    saveText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#FFFFFF' },
  });
}
