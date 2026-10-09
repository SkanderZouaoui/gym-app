import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import type { ScanOutcome } from '../hooks/useAttendance';

const REASON_LABELS: Record<string, string> = {
  TOKEN_INVALID: 'QR invalide',
  TOKEN_EXPIRED: 'QR expiré, redemande-en un',
  TOKEN_REPLAYED: 'QR déjà utilisé',
  SCANNER_NOT_AUTHORIZED: "Vous n'êtes pas autorisé à scanner ce cours",
  SESSION_CANCELLED: 'Ce cours est annulé',
  OUTSIDE_WINDOW: "Hors de la fenêtre d'ouverture du scan",
  NO_BOOKING: 'Aucune réservation trouvée',
  BOOKING_WAITLISTED: "En liste d'attente, pas encore confirmé",
  BOOKING_CANCELLED: 'Réservation annulée',
  ALREADY_CHECKED_IN: 'Présence déjà enregistrée',
  NO_MEMBERSHIP: 'Aucun abonnement actif',
  MEMBERSHIP_EXPIRED: 'Abonnement expiré',
  MEMBERSHIP_SUSPENDED: 'Abonnement suspendu',
  PLAN_NOT_VALID_AT_BRANCH: 'Formule non valable sur ce site',
};

export function ScanResultOverlay({ outcome, onDismiss }: { outcome: ScanOutcome; onDismiss: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const granted = outcome.result === 'GRANTED';

  return (
    <Pressable style={[styles.overlay, granted ? styles.success : styles.danger]} onPress={onDismiss}>
      <View style={styles.iconCircle}>
        <MaterialIcons
          name={granted ? 'check-circle' : 'cancel'}
          size={72}
          color={granted ? colors.success : colors.danger}
        />
      </View>
      {granted ? (
        <>
          <Text style={styles.title}>Présence confirmée</Text>
          {outcome.member ? (
            <Text style={styles.subtitle}>
              {outcome.member.firstName} {outcome.member.lastName}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={styles.title}>Accès refusé</Text>
          <Text style={styles.subtitle}>{REASON_LABELS[outcome.reasonCode] ?? outcome.reasonCode}</Text>
        </>
      )}
      <Text style={styles.hint}>Touchez l’écran pour continuer</Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
    },
    // Fond plein-écran volontairement fixe (vert/rouge saturé) — ce flash de
    // confirmation reste identique quel que soit le thème de l'app.
    success: { backgroundColor: 'rgba(22,163,74,0.95)' },
    danger: { backgroundColor: 'rgba(220,38,38,0.95)' },
    iconCircle: {
      width: 110,
      height: 110,
      borderRadius: 999,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: { fontFamily: fonts.head, fontSize: 24, color: '#fff', textAlign: 'center' },
    subtitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: '#fff', textAlign: 'center' },
    hint: { fontFamily: fonts.body, fontSize: 13, color: '#fff', opacity: 0.8, marginTop: spacing.lg },
  });
}
