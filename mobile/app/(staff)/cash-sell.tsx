import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useStaffRoutes } from '../../src/navigation/staffRoutes';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMemberDetail, useSellMembership, type PaymentMethod } from '../../src/hooks/useStaff';
import { usePlans } from '../../src/hooks/usePlans';
import { useOrganizationConfig } from '../../src/hooks/useAdmin';
import { Banner, ScreenTitle } from '../../src/components/ui';
import { InitialsAvatar, METHOD_ICON, METHOD_LABEL, formatMoney } from '../../src/components/staff/staffUi';
import { ApiError } from '../../src/api/client';
import { useTranslation } from 'react-i18next';

const METHODS: PaymentMethod[] = ['CASH', 'OTHER', 'TRANSFER', 'CHECK'];

function durationLabel(days: number): string {
  if (days >= 360) return `${Math.round(days / 365)} an${days >= 730 ? 's' : ''}`;
  if (days >= 28) return `${Math.round(days / 30)} mois`;
  return `${days} jours`;
}

/** Encaissement : formule, moyen de paiement, puis création de l'abonnement et enregistrement du paiement. */
export default function StaffCashSellScreen() {
  const { t } = useTranslation();
  const routes = useStaffRoutes();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: member } = useMemberDetail(memberId);
  const { data: plans } = usePlans({ all: true });
  const sell = useSellMembership();
  const { data: orgConfig } = useOrganizationConfig();
  const methods = METHODS.filter((m) => orgConfig?.paymentMethods[m] !== false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [error, setError] = useState<string | null>(null);

  const plan = (plans ?? []).find((p) => p.id === planId);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(routes.cash));

  const submit = () => {
    if (!member || !plan) return;
    setError(null);
    sell.mutate(
      { userId: member.id, planId: plan.id, amount: Math.round(Number(plan.price)), method },
      {
        onSuccess: ({ payment }) => router.replace({ pathname: routes.cashReceipt, params: { paymentId: payment.id, fresh: '1' } }),
        onError: (e) =>
          setError(e instanceof ApiError && e.code === 'STAFF_PAYMENTS_DISABLED' ? t('staff.lenregistrement_des_paiements_est_desactive') : t('staff.impossible_denregistrer_lencaissement')),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.retour')}</Text>
        </Pressable>
        <ScreenTitle title={t('staff.encaissement_2')} subtitle={t('staff.inscription_sur_place')} />

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        {member ? (
          <View style={[styles.memberCard, cardShadow]}>
            <InitialsAvatar first={member.firstName} last={member.lastName} />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberLabel}>{t('staff.adherent_2')}</Text>
              <Text style={styles.memberName}>{member.firstName} {member.lastName}</Text>
            </View>
            <Pressable onPress={() => router.replace(routes.cashSelect)} hitSlop={8}>
              <Text style={styles.change}>{t('common.changer')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View>
          <Text style={styles.label}>{t('staff.type_dabonnement')}</Text>
          <View style={[styles.optionsCard, cardShadow]}>
            {(plans ?? []).map((p) => {
              const active = p.id === planId;
              return (
                <Pressable key={p.id} onPress={() => setPlanId(p.id)} style={[styles.optionRow, active && styles.optionRowActive]}>
                  {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.optionTile}>
                      <MaterialIcons name="card-membership" size={22} color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.optionTile, { backgroundColor: colors.surface2 }]}>
                      <MaterialIcons name="card-membership" size={22} color={colors.primaryInk} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.optionTitle}>{p.name}</Text>
                    <Text style={styles.optionSub} numberOfLines={1}>{durationLabel(p.durationDays)}{p.includesLabel ? ` · ${p.includesLabel}` : ''}</Text>
                  </View>
                  <Text style={styles.optionPrice}>{formatMoney(p.price)}</Text>
                  <View style={[styles.radio, active && { borderColor: colors.primary }]}>{active ? <View style={styles.radioDot} /> : null}</View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.label}>{t('staff.moyen_de_paiement')}</Text>
          <View style={styles.methodGrid}>
            {methods.map((m) => {
              const active = method === m;
              return (
                <Pressable key={m} onPress={() => setMethod(m)} style={[styles.methodCard, active && styles.methodCardActive]}>
                  {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.methodTile}>
                      <MaterialIcons name={METHOD_ICON[m]} size={22} color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.methodTile, { backgroundColor: colors.surface2 }]}>
                      <MaterialIcons name={METHOD_ICON[m]} size={22} color={colors.primaryInk} />
                    </View>
                  )}
                  <Text style={styles.methodLabel}>{METHOD_LABEL[m]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={submit}
          disabled={!plan || !member || sell.isPending}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, (!plan || sell.isPending) && { opacity: 0.5 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="point-of-sale" size={22} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{sell.isPending ? t('staff.encaissement_3') : plan ? t('staff.encaisser_2', { v0: formatMoney(plan.price) }) : t('staff.encaisser')}</Text>
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
    memberCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    memberLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    memberName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    change: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginBottom: 8 },
    optionsCard: { padding: 4, gap: 2, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
    optionRowActive: { backgroundColor: colors.primarySoft },
    optionTile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    optionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    optionSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    optionPrice: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
    methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    methodCard: {
      width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    methodCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    methodTile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    methodLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
