import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useStaffRoutes } from '../../src/navigation/staffRoutes';
import { useTheme } from '../../src/theme/ThemeContext';
import { usePayments } from '../../src/hooks/useStaff';
import { useRemoteConfig } from '../../src/config/RemoteConfigContext';
import { EmptyState } from '../../src/components/ui';
import { METHOD_LABEL, formatMoney } from '../../src/components/staff/staffUi';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../../src/i18n';

const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' });

/** Reçu d'un encaissement : après un encaissement (« Paiement reçu ») ou depuis l'historique de la caisse. */
export default function StaffCashReceiptScreen() {
  const { t } = useTranslation();
  const routes = useStaffRoutes();
  const { paymentId, fresh } = useLocalSearchParams<{ paymentId: string; fresh?: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { config } = useRemoteConfig();
  const { data: payments, isLoading } = usePayments();
  const payment = (payments ?? []).find((p) => p.id === paymentId);
  const isFresh = fresh === '1';

  const close = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace(routes.cash);
  };

  if (isLoading && !payment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!payment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <EmptyState icon="receipt-long" title={t('staff.recu_introuvable')} text={t('staff.cet_encaissement_nexiste_plus')} tone="danger" actionLabel={t('common.retour')} onAction={close} />
        </View>
      </SafeAreaView>
    );
  }

  const number = payment.id.slice(0, 8).toUpperCase();
  const name = `${payment.membership.user.firstName} ${payment.membership.user.lastName}`;
  const rows = [
    { k: t('staff.adherent_2'), v: name },
    { k: t('staff.formule'), v: payment.membership.plan.name },
    { k: t('staff.validite'), v: `${fmt(payment.membership.startDate)} → ${fmt(payment.membership.endDate)}` },
    { k: t('staff.moyen_de_paiement'), v: METHOD_LABEL[payment.method] },
  ];

  const share = () =>
    void Share.share({
      message: t('staff.recu_n_montant', { number, brand: config.branding.brand, name, name_: payment.membership.plan.name, v4: formatMoney(payment.amount), v5: METHOD_LABEL[payment.method], v6: fmt(payment.recordedAt) }),
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        {isFresh ? (
          <View style={styles.success}>
            <View style={styles.successCircle}>
              <MaterialIcons name="check" size={38} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>{t('staff.paiement_recu')}</Text>
            <Text style={styles.successSub}>{name}</Text>
          </View>
        ) : (
          <Pressable style={styles.back} onPress={close} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
            <Text style={styles.backText}>{t('common.encaissements')}</Text>
          </Pressable>
        )}

        <View style={[styles.receipt, cardShadow]}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.receiptTop}>
            <View style={styles.mono}>
              <Text style={styles.monoText}>{config.branding.brand.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>{config.branding.brand}</Text>
              <Text style={styles.receiptNo}>{t('staff.recu_n', { number })}</Text>
            </View>
            <Text style={styles.receiptDate}>{new Date(payment.recordedAt).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </LinearGradient>

          <View style={styles.amountBlock}>
            <Text style={styles.amountKicker}>{t('staff.montant_encaisse')}</Text>
            <Text style={styles.amount}>{formatMoney(payment.amount)}</Text>
          </View>

          <View style={styles.tear}>
            <View style={[styles.notch, { left: -14 }]} />
            <View style={styles.dash} />
            <View style={[styles.notch, { right: -14 }]} />
          </View>

          <View style={styles.rows}>
            {rows.map((r) => (
              <View key={r.k} style={styles.rowLine}>
                <Text style={styles.rowKey}>{r.k}</Text>
                <Text style={styles.rowValue}>{r.v}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.thanks}>{t('staff.merci_de_votre_confiance')}</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Pressable onPress={close} style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <MaterialIcons name="check" size={24} color={colors.primaryContrast} />
              <Text style={styles.ctaText}>{t('staff.terminer')}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.share, pressed && { transform: [{ scale: 0.98 }] }]} onPress={share}>
            <MaterialIcons name="ios-share" size={22} color={colors.text} />
            <Text style={styles.shareText}>{t('staff.partager_le_recu')}</Text>
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
    success: { alignItems: 'center', gap: 6, paddingTop: 12, paddingBottom: 6 },
    successCircle: {
      width: 68, height: 68, borderRadius: 34, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
      borderWidth: 8, borderColor: colors.successSoft,
    },
    successTitle: { fontFamily: fonts.head, fontSize: 26, letterSpacing: -0.8, color: colors.text, marginTop: 12 },
    successSub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    receipt: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    receiptTop: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 22 },
    mono: { width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    monoText: { fontFamily: fonts.head, fontSize: 17, color: '#FFFFFF' },
    brand: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.4, color: '#FFFFFF' },
    receiptNo: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
    receiptDate: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.92)', textAlign: 'right' },
    amountBlock: { alignItems: 'center', paddingTop: 22, paddingBottom: 6 },
    amountKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted },
    amount: { fontFamily: fonts.head, fontSize: 48, lineHeight: 54, letterSpacing: -2, color: colors.text, marginTop: 4 },
    tear: { height: 28, marginTop: 8, justifyContent: 'center' },
    dash: { marginHorizontal: 20, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.border },
    notch: { position: 'absolute', top: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
    rows: { paddingHorizontal: 20, paddingBottom: 4 },
    rowLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 44 },
    rowKey: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    rowValue: { flex: 1, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    thanks: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: colors.muted, paddingVertical: 16 },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    share: {
      minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    shareText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  });
}
