import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAdminPlans, useOrganizationConfig, useTogglePlanActive, useUpdateOrganizationConfig } from '../../src/hooks/useAdmin';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { ScreenTitle } from '../../src/components/ui';
import { formatMoney } from '../../src/components/staff/staffUi';

function durationLabel(days: number): string {
  if (days >= 360) return `${Math.round(days / 365)} an${days >= 730 ? 's' : ''}`;
  if (days >= 28) return `${Math.round(days / 30)} mois`;
  return `${days} jours`;
}

/** Abonnements (admin) : forfaits, tarifs, visibilité dans l'app, activation. */
export default function AdminPlansScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: plans, refetch } = useAdminPlans();
  const toggle = useTogglePlanActive();
  const { data: config } = useOrganizationConfig();
  const saveConfig = useUpdateOrganizationConfig();
  const [discounts, setDiscounts] = useState<Record<string, number>>({});
  const [discountsDirty, setDiscountsDirty] = useState(false);
  useEffect(() => {
    if (config && !discountsDirty) setDiscounts(config.discounts);
  }, [config, discountsDirty]);
  const setDiscount = (months: string, v: number) => {
    setDiscounts((d) => ({ ...d, [months]: Math.max(0, Math.min(50, v)) }));
    setDiscountsDirty(true);
  };
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  // Revenu mensuel récurrent : prix ramené au mois × abonnés actifs, sur les forfaits actifs.
  const monthly = (p: { price: string; durationDays: number }) => (Number(p.price) / Math.max(1, p.durationDays)) * 30;
  const activePlans = (plans ?? []).filter((p) => p.isActive);
  const subscribers = activePlans.reduce((n, p) => n + (p.activeSubscribers ?? 0), 0);
  const mrr = activePlans.reduce((sum, p) => sum + monthly(p) * (p.activeSubscribers ?? 0), 0);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Plus</Text>
        </Pressable>
        <ScreenTitle
          title="Abonnements"
          subtitle="Forfaits, tarifs et visibilité"
          right={
            <Pressable
              accessibilityLabel="Créer un forfait"
              onPress={() => router.push('/(admin)/plan-form')}
              style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                <MaterialIcons name="add" size={28} color={colors.primaryContrast} />
              </LinearGradient>
            </Pressable>
          }
        />

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <View style={styles.heroTop}>
              <Text style={styles.heroKicker}>REVENU MENSUEL RÉCURRENT</Text>
              <MaterialIcons name="trending-up" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(Math.round(mrr))}</Text>
            <Text style={styles.heroSub}>
              {activePlans.length} forfait{activePlans.length > 1 ? 's' : ''} actif{activePlans.length > 1 ? 's' : ''} · {subscribers} abonné{subscribers > 1 ? 's' : ''}
            </Text>
          </LinearGradient>
        </View>

        <View style={{ gap: 10 }}>
          {(plans ?? []).map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }, !p.isActive && { opacity: 0.6 }]}
              onPress={() => router.push({ pathname: '/(admin)/plan-form', params: { id: p.id } })}
            >
              <View style={styles.top}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.meta}>{durationLabel(p.durationDays)}{p.includesLabel ? ` · ${p.includesLabel}` : ''} · {p.activeSubscribers ?? 0} abonné{(p.activeSubscribers ?? 0) > 1 ? 's' : ''}</Text>
                </View>
                <Switch
                  value={p.isActive}
                  onValueChange={(v) => toggle.mutate({ id: p.id, active: v })}
                  trackColor={{ true: colors.primary, false: colors.surface2 }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.surface2}
                />
              </View>
              <View style={styles.bottom}>
                <Text style={styles.price}>{formatMoney(p.price)}</Text>
                <View style={styles.tags}>
                  {p.isPopular ? (
                    <View style={[styles.tag, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.tagText, { color: colors.primaryContrast }]}>Populaire</Text>
                    </View>
                  ) : null}
                  <View style={[styles.tag, { backgroundColor: p.isVisibleInApp ? colors.successSoft : colors.surface2 }]}>
                    <Text style={[styles.tagText, { color: p.isVisibleInApp ? colors.successInk : colors.muted }]}>
                      {p.isVisibleInApp ? 'Visible dans l’app' : 'Masqué'}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Remises par durée d’engagement</Text>
        <View style={[styles.card, cardShadow]}>
          {['3', '6', '12'].map((m, i) => (
            <View key={m}>
              {i > 0 ? <View style={styles.sep} /> : null}
              <View style={styles.discRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{m} mois</Text>
                  <Text style={styles.meta}>Remise sur le tarif mensuel</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => setDiscount(m, (discounts[m] ?? 0) - 1)}>
                    <MaterialIcons name="remove" size={18} color={colors.text} />
                  </Pressable>
                  <Text style={styles.stepText}>{discounts[m] ?? 0} %</Text>
                  <Pressable style={styles.stepBtn} onPress={() => setDiscount(m, (discounts[m] ?? 0) + 1)}>
                    <MaterialIcons name="add" size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
          <Pressable
            disabled={!discountsDirty || saveConfig.isPending || !config}
            onPress={() => config && saveConfig.mutate({ ...config, discounts }, { onSuccess: () => setDiscountsDirty(false) })}
            style={[styles.saveBtn, (!discountsDirty || saveConfig.isPending) && { opacity: 0.5 }]}
          >
            <Text style={styles.saveText}>{saveConfig.isPending ? 'Enregistrement…' : discountsDirty ? 'Enregistrer les remises' : 'Remises enregistrées'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    addShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 6 },
    addButton: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    card: { padding: 16, gap: 12, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
    bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    price: { fontFamily: fonts.head, fontSize: 24, letterSpacing: -0.8, color: colors.text },
    tags: { flexDirection: 'row', gap: 6, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
    heroShadow: { borderRadius: 28, shadowColor: colors.primary, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 7 },
    hero: { borderRadius: 28, padding: 22, overflow: 'hidden', gap: 4 },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.92)' },
    heroValue: { fontFamily: fonts.head, fontSize: 44, letterSpacing: -1.8, color: '#FFFFFF' },
    heroSub: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: 'rgba(255,255,255,0.92)' },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginTop: 6 },
    sep: { height: 1, backgroundColor: colors.border },
    discRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    stepper: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    stepBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
    stepText: { minWidth: 52, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    saveBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginTop: 4 },
    saveText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
    tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    tagText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  });
}
