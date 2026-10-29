import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAttendancePolicy } from '../hooks/useAdmin';
import { useTabBarStore } from '../store/tabBar';
import type { ScanOutcome } from '../hooks/useAttendance';

const REASON_LABELS: Record<string, string> = {
  TOKEN_INVALID: 'QR non reconnu',
  TOKEN_EXPIRED: 'QR expiré',
  TOKEN_REPLAYED: 'QR déjà utilisé',
  SCANNER_NOT_AUTHORIZED: 'Scan non autorisé',
  SESSION_CANCELLED: 'Cours annulé',
  OUTSIDE_WINDOW: 'Pointage fermé pour ce cours',
  NO_BOOKING: 'Pas de réservation',
  MEMBER_NOT_FOUND: 'Code inconnu',
  BOOKING_WAITLISTED: "Sur liste d'attente",
  BOOKING_CANCELLED: 'Réservation annulée',
  ALREADY_CHECKED_IN: 'Déjà pointé',
  NO_MEMBERSHIP: 'Aucun abonnement',
  MEMBERSHIP_EXPIRED: 'Abonnement expiré',
  MEMBERSHIP_SUSPENDED: 'Abonnement suspendu',
};

const REASON_HINTS: Record<string, string> = {
  TOKEN_INVALID: 'Ce QR ne vient pas de l’application. Demandez à l’adhérent d’ouvrir son code.',
  TOKEN_EXPIRED: 'Demandez à l’adhérent de rouvrir son QR dans l’application.',
  TOKEN_REPLAYED: 'Ce QR a déjà servi. Demandez à l’adhérent d’en afficher un nouveau.',
  SCANNER_NOT_AUTHORIZED: 'Vous n’avez pas le droit de pointer ce cours.',
  SESSION_CANCELLED: 'Ce cours a été annulé, personne ne peut être pointé.',
  NO_BOOKING: 'Cet adhérent n’a pas réservé ce cours.',
  MEMBER_NOT_FOUND: 'Aucun adhérent n’a ce code. Vérifiez-le ou cherchez par nom.',
  BOOKING_WAITLISTED: 'Il est sur liste d’attente : aucune place ne s’est libérée.',
  BOOKING_CANCELLED: 'L’adhérent a annulé sa réservation pour ce cours.',
  ALREADY_CHECKED_IN: 'Sa présence à ce cours est déjà enregistrée.',
  NO_MEMBERSHIP: 'Proposez-lui de souscrire un abonnement à la caisse.',
  MEMBERSHIP_EXPIRED: 'Son abonnement est terminé : à renouveler à la caisse.',
  MEMBERSHIP_SUSPENDED: 'Son abonnement est suspendu. Voir avec l’administration.',
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
      ? `On peut pointer de ${policy?.scanOpensMinutesBefore ?? 15} min avant le début du cours jusqu’à ${policy?.scanClosesMinutesAfterStart ?? 10} min après. Ce créneau est passé ou pas encore ouvert.`
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
          {granted ? 'PRÉSENCE CONFIRMÉE' : 'SCAN REFUSÉ'}
        </Text>
        <Text style={styles.title}>{granted ? memberName ?? 'Bienvenue' : reason}</Text>
        {!granted && memberName ? <Text style={styles.member}>{memberName}</Text> : null}
        <Text style={styles.subtitle}>
          {granted
            ? 'Bon cours !'
            : hint ?? 'Veuillez réessayer.'}
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
            <Text style={styles.primaryText}>{granted ? 'Continuer' : 'Réessayer'}</Text>
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
            <Text style={styles.ghostText}>Pointage manuel</Text>
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
