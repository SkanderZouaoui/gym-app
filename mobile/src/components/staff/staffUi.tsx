import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import type { PaymentMethod } from '../../hooks/useStaff';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../i18n';

/** Pastille ronde : photo de profil si l'adhérent/l'équipier en a une, sinon initiales (dégradé d'accent). */
export function InitialsAvatar({ first, last, size = 44, photoUrl }: { first: string; last: string; size?: number; photoUrl?: string | null }) {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({ box: { alignItems: 'center', justifyContent: 'center' }, text: { fontFamily: fonts.bodyBold, color: '#FFFFFF' } }), []);
  // URL signée expirée ou illisible : on retombe sur les initiales.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (photoUrl && failedUrl !== photoUrl) {
    return <Image source={{ uri: photoUrl }} onError={() => setFailedUrl(photoUrl)} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface2 }} accessibilityIgnoresInvertColors />;
  }
  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryPressed]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.box, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.text, { fontSize: size * 0.32 }]}>{`${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()}</Text>
    </LinearGradient>
  );
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  get CASH() { return i18n.t('common.especes'); },
  get TRANSFER() { return i18n.t('common.virement'); },
  get CHECK() { return i18n.t('common.cheque'); },
  get OTHER() { return i18n.t('common.carte'); },
};

export const METHOD_ICON: Record<PaymentMethod, 'payments' | 'account-balance' | 'receipt-long' | 'credit-card'> = {
  CASH: 'payments',
  TRANSFER: 'account-balance',
  CHECK: 'receipt-long',
  OTHER: 'credit-card',
};

export function formatMoney(amount: number | string): string {
  return `${Number(amount).toLocaleString(dateLocale())} DT`;
}

/** Statut affiché pour un adhérent à partir de son abonnement le plus récent. */
export function membershipBadge(status: string | undefined, daysLeft: number | null) {
  if (status === 'ACTIVE') return daysLeft !== null && daysLeft <= 14 ? { label: i18n.t('staff.expire_bientot'), tone: 'warning' as const } : { label: i18n.t('staff.actif'), tone: 'success' as const };
  if (status === 'EXPIRED') return { label: i18n.t('staff.expire'), tone: 'danger' as const };
  if (status === 'SUSPENDED') return { label: i18n.t('staff.suspendu'), tone: 'warning' as const };
  return { label: i18n.t('staff.sans_abonnement'), tone: 'muted' as const };
}

/** Pastille de statut colorée (succès / alerte / danger / neutre). */
export function StatusTag({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' | 'muted' }) {
  useTranslation();
  const { colors } = useTheme();
  const palette = {
    success: { bg: colors.successSoft, ink: colors.successInk },
    warning: { bg: colors.warningSoft, ink: colors.warningInk },
    danger: { bg: colors.dangerSoft, ink: colors.dangerInk },
    muted: { bg: colors.surface2, ink: colors.muted },
  }[tone];
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: palette.bg }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: palette.ink }}>{label}</Text>
    </View>
  );
}
