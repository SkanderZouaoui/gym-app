import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAdminPlans, useSavePlan } from '../../src/hooks/useAdmin';
import { Banner, ScreenTitle } from '../../src/components/ui';

const DURATIONS = [
  { label: '1 mois', days: 30 },
  { label: '3 mois', days: 90 },
  { label: '6 mois', days: 180 },
  { label: '1 an', days: 365 },
];

/** Création / modification d'un forfait d'abonnement. */
export default function AdminPlanFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: plans } = useAdminPlans();
  const save = useSavePlan();
  const existing = id ? (plans ?? []).find((p) => p.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [days, setDays] = useState(String(existing?.durationDays ?? 30));
  const [price, setPrice] = useState(existing ? String(Number(existing.price)) : '');
  const [includes, setIncludes] = useState(existing?.includesLabel ?? '');
  const [popular, setPopular] = useState(existing?.isPopular ?? false);
  const [visible, setVisible] = useState(existing?.isVisibleInApp ?? true);
  const [error, setError] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(!!existing || !id);
  if (!hydrated && existing) {
    setHydrated(true);
    setName(existing.name);
    setDescription(existing.description ?? '');
    setDays(String(existing.durationDays));
    setPrice(String(Number(existing.price)));
    setIncludes(existing.includesLabel ?? '');
    setPopular(existing.isPopular);
    setVisible(existing.isVisibleInApp);
  }

  const valid = name.trim() && Number(days) >= 1 && price !== '' && Number(price) >= 0;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/plans'));

  const submit = () => {
    setError(null);
    save.mutate(
      {
        id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          durationDays: Math.round(Number(days)),
          price: Math.round(Number(price)),
          includesLabel: includes.trim() || undefined,
          isPopular: popular,
          isVisibleInApp: visible,
        },
      },
      { onSuccess: goBack, onError: () => setError('Impossible d’enregistrer le forfait.') },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Abonnements</Text>
        </Pressable>
        <ScreenTitle title={existing ? 'Modifier le forfait' : 'Nouveau forfait'} subtitle="Durée, tarif et visibilité dans l’app" />

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <View>
          <Text style={styles.label}>Nom</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Ex. Gym + cours" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <View>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ce que comprend le forfait"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, { minHeight: 84, paddingTop: 14, textAlignVertical: 'top' }]}
          />
        </View>

        <View>
          <Text style={styles.label}>Durée</Text>
          <View style={styles.pillRow}>
            {DURATIONS.map((d) => {
              const active = Number(days) === d.days;
              return (
                <Pressable key={d.days} onPress={() => setDays(String(d.days))} style={styles.pill}>
                  {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  ) : null}
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{d.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Durée (jours)</Text>
            <TextInput value={days} onChangeText={setDays} keyboardType="number-pad" style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Prix (DT)</Text>
            <TextInput value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={styles.input} />
          </View>
        </View>

        <View>
          <Text style={styles.label}>Ce qui est inclus</Text>
          <TextInput value={includes} onChangeText={setIncludes} placeholder="Ex. Accès libre + cours collectifs" placeholderTextColor={colors.muted} style={styles.input} />
        </View>

        <View style={[styles.switchCard, cardShadow]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Visible dans l’app</Text>
              <Text style={styles.switchSub}>Affiché dans l’écran Abonnement des adhérents</Text>
            </View>
            <Switch value={visible} onValueChange={setVisible} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
          </View>
          <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Badge « Populaire »</Text>
              <Text style={styles.switchSub}>Met le forfait en avant</Text>
            </View>
            <Switch value={popular} onValueChange={setPopular} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={submit}
          disabled={!valid || save.isPending}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, (!valid || save.isPending) && { opacity: 0.5 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="check" size={24} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 150 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginBottom: 8 },
    input: {
      minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      paddingHorizontal: 16, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text,
    },
    row: { flexDirection: 'row', gap: 10 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      height: 38, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    pillText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    pillTextActive: { color: colors.primaryContrast },
    switchCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66 },
    switchTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
    switchSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
