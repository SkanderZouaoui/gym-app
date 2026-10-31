import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAttendancePolicy } from '../hooks/useAdmin';
import { useTabBarStore } from '../store/tabBar';
import type { ScanOutcome } from '../hooks/useAttendance';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const REASON_LABELS: Record<string, string> = {
  get TOKEN_INVALID() { return i18n.t('common.qr_not_recognized'); },
  get TOKEN_EXPIRED() { return i18n.t('common.qr_expire'); },
  get TOKEN_REPLAYED() { return i18n.t('common.qr_deja_utilise'); },
  get SCANNER_NOT_AUTHORIZED() { return i18n.t('common.scan_non_autorise'); },
  get SESSION_CANCELLED() { return i18n.t('common.cours_annule'); },
  get OUTSIDE_WINDOW() { return i18n.t('common.pointage_ferme_pour_ce_cours'); },
  get NO_BOOKING() { return i18n.t('common.pas_de_reservation'); },
  get MEMBER_NOT_FOUND() { return i18n.t('common.code_inconnu'); },
  get BOOKING_WAITLISTED() { return i18n.t('common.sur_liste_dattente'); },
  get BOOKING_CANCELLED() { return i18n.t('common.reservation_annulee'); },
  get ALREADY_CHECKED_IN() { return i18n.t('common.deja_pointe'); },
  get NO_MEMBERSHIP() { return i18n.t('common.aucun_abonnement'); },
  get MEMBERSHIP_EXPIRED() { return i18n.t('common.abonnement_expire'); },
  get MEMBERSHIP_SUSPENDED() { return i18n.t('common.abonnement_suspendu'); },
};

const REASON_HINTS: Record<string, string> = {
  get TOKEN_INVALID() { return i18n.t('common.ce_qr_ne_vient_pas'); },
  get TOKEN_EXPIRED() { return i18n.t('common.demandez_a_ladherent_de_rouvrir'); },
  get TOKEN_REPLAYED() { return i18n.t('common.ce_qr_a_deja_servi'); },
  get SCANNER_NOT_AUTHORIZED() { return i18n.t('common.vous_navez_pas_le_droit'); },
  get SESSION_CANCELLED() { return i18n.t('common.ce_cours_a_ete_annule'); },
  get NO_BOOKING() { return i18n.t('common.cet_adherent_na_pas_reserve'); },
  get MEMBER_NOT_FOUND() { return i18n.t('common.aucun_adherent_na_ce_code'); },
  get BOOKING_WAITLISTED() { return i18n.t('common.il_est_sur_liste_dattente'); },
  get BOOKING_CANCELLED() { return i18n.t('common.ladherent_a_annule_sa_reservation'); },
  get ALREADY_CHECKED_IN() { return i18n.t('common.sa_presence_a_ce_cours'); },
  get NO_MEMBERSHIP() { return i18n.t('common.proposez_lui_de_souscrire_un'); },
  get MEMBERSHIP_EXPIRED() { return i18n.t('common.son_abonnement_est_termine_a'); },
  get MEMBERSHIP_SUSPENDED() { return i18n.t('common.son_abonnement_est_suspendu_voir'); },
};

export function ScanResultOverlay({
  outcome,
  onDismiss,
  onManual,
}: {
  outcome: ScanOutcome;
  onDismiss: () => void;
  onManual?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(), []);
  const granted = outcome.result === 'GRANTED';
  const setTabBarHidden = useTabBarStore((st) => st.setHidden);

  // La barre d'onglets flottante masquerait les boutons : on la replie le temps du résultat.
  useEffect(() => {
    setTabBarHidden(true);
    return () => setTabBarHidden(false);
  }, [setTabBarHidden]);

  const tint = granted ? '#10B981' : '#EF4444';
  const reason = REASON_LABELS[outcome.reasonCode] ?? outcome.reasonCode;
  const { data: policy } = useAttendancePolicy();
  const hint =
    outcome.reasonCode === 'OUTSIDE_WINDOW'
      ? t('common.on_peut_pointer_de_min', { v0: policy?.scanOpensMinutesBefore ?? 15, v1: policy?.scanClosesMinutesAfterStart ?? 10 })
      : REASON_HINTS[outcome.reasonCode];
  const memberName = outcome.member ? `${outcome.member.firstName} ${outcome.member.lastName}` : null;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={granted ? ['#06140F', '#0A0A12'] : ['#1A0B10', '#0A0A12']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <View style={[styles.halo2, { backgroundColor: tint + '14' }]}>
          <View style={[styles.halo1, { backgroundColor: tint + '2E' }]}>
            <LinearGradient
              colors={granted ? ['#34D399', '#059669'] : ['#F87171', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.circle, { shadowColor: tint }]}
            >
              <MaterialIcons name={granted ? 'check' : 'close'} size={50} color="#FFFFFF" />
            </LinearGradient>
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: granted ? '#6EE7B7' : '#FCA5A5' }]}>
          {granted ? t('common.presence_confirmee') : t('common.scan_refuse')}
        </Text>
        <Text style={styles.title}>{granted ? memberName ?? t('common.welcome') : reason}</Text>
        {!granted && memberName ? <Text style={styles.member}>{memberName}</Text> : null}
        <Text style={styles.subtitle}>
          {granted
            ? t('common.enjoy_class')
            : hint ?? t('common.veuillez_reessayer')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onDismiss} style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryPressed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryText}>{granted ? t('auth.continuer') : t('common.retour')}</Text>
          </LinearGradient>
        </Pressable>
        {!granted && onManual ? (
          <Pressable
            onPress={() => {
              onDismiss();
              onManual();
            }}
            style={({ pressed }) => [styles.ghostBtn, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.ghostText}>{t('common.pointage_manuel')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    screen: { ...StyleSheet.absoluteFill, zIndex: 50, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    halo2: { width: 210, height: 210, borderRadius: 105, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    halo1: { width: 156, height: 156, borderRadius: 78, alignItems: 'center', justifyContent: 'center' },
    circle: {
      width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center',
      shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.55, shadowRadius: 24, elevation: 10,
    },
    eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.6 },
    title: { fontFamily: fonts.head, fontSize: 34, letterSpacing: -1.2, color: '#FFFFFF', textAlign: 'center' },
    member: { fontFamily: fonts.bodyBold, fontSize: 16, color: 'rgba(255,255,255,0.92)' },
    subtitle: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.72)', textAlign: 'center', maxWidth: 300 },
    actions: { gap: 10 },
    primaryBtn: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    primaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#FFFFFF' },
    ghostBtn: {
      height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    },
    ghostText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#FFFFFF' },
  });
}
