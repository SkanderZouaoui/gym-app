import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import type { PaymentMethod } from '../../hooks/useStaff';

/** Pastille ronde à initiales (dégradé d'accent). */
export function InitialsAvatar({ first, last, size = 44 }: { first: string; last: string; size?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({ box: { alignItems: 'center', justifyContent: 'center' }, text: { fontFamily: fonts.bodyBold, color: '#FFFFFF' } }), []);
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
  CASH: 'Espèces',
  TRANSFER: 'Virement',
  CHECK: 'Chèque',
  OTHER: 'Carte',
};

export const METHOD_ICON: Record<PaymentMethod, 'payments' | 'account-balance' | 'receipt-long' | 'credit-card'> = {
  CASH: 'payments',
  TRANSFER: 'account-balance',
  CHECK: 'receipt-long',
  OTHER: 'credit-card',
};

export function formatMoney(amount: number | string): string {
  return `${Number(amount).toLocaleString('fr-FR')} DT`;
}

/** Statut affiché pour un adhérent à partir de son abonnement le plus récent. */
export function membershipBadge(status: string | undefined, daysLeft: number | null) {
  if (status === 'ACTIVE') return daysLeft !== null && daysLeft <= 14 ? { label: 'Expire bientôt', tone: 'warning' as const } : { label: 'Actif', tone: 'success' as const };
  if (status === 'EXPIRED') return { label: 'Expiré', tone: 'danger' as const };
  if (status === 'SUSPENDED') return { label: 'Suspendu', tone: 'warning' as const };
  return { label: 'Sans abonnement', tone: 'muted' as const };
}

/** Pastille de statut colorée (succès / alerte / danger / neutre). */
export function StatusTag({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' | 'muted' }) {
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
