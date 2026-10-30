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
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';

const DURATIONS = [
  { get label() { return i18n.t('admin.1_mois'); }, days: 30 },
  { get label() { return i18n.t('common.3_mois'); }, days: 90 },
  { get label() { return i18n.t('admin.6_mois'); }, days: 180 },
  { get label() { return i18n.t('admin.1_an'); }, days: 365 },
];

/** Création / modification d'un forfait d'abonnement. */
export default function AdminPlanFormScreen() {
  const { t } = useTranslation();
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
      { onSuccess: goBack, onError: () => setError(t('admin.impossible_denregistrer_le_forfait')) },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('admin.abonnements')}</Text>
        </Pressable>
        <ScreenTitle title={existing ? t('admin.modifier_le_forfait') : t('admin.nouveau_forfait')} subtitle={t('admin.duree_tarif_et_visibilite_dans')} />

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <View>
          <Text style={styles.label}>{t('common.nom')}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={t('admin.ex_gym_cours')} placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <View>
          <Text style={styles.label}>{t('admin.description')}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('admin.ce_que_comprend_le_forfait')}
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, { minHeight: 84, paddingTop: 14, textAlignVertical: 'top' }]}
          />
        </View>

        <View>
          <Text style={styles.label}>{t('common.duree')}</Text>
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
            <Text style={styles.label}>{t('admin.duree_jours')}</Text>
            <TextInput value={days} onChangeText={setDays} keyboardType="number-pad" style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('admin.prix_dt')}</Text>
            <TextInput value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={styles.input} />
          </View>
        </View>

        <View>
          <Text style={styles.label}>{t('admin.ce_qui_est_inclus')}</Text>
          <TextInput value={includes} onChangeText={setIncludes} placeholder={t('admin.ex_acces_libre_cours_collectifs')} placeholderTextColor={colors.muted} style={styles.input} />
        </View>

        <View style={[styles.switchCard, cardShadow]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>{t('admin.visible_dans_lapp')}</Text>
              <Text style={styles.switchSub}>{t('admin.affiche_dans_lecran_abonnement_des')}</Text>
            </View>
            <Switch value={visible} onValueChange={setVisible} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
          </View>
          <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>{t('admin.badge_populaire')}</Text>
              <Text style={styles.switchSub}>{t('admin.met_le_forfait_en_avant')}</Text>
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
            <Text style={styles.ctaText}>{save.isPending ? t('common.enregistrement') : t('member.enregistrer')}</Text>
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
