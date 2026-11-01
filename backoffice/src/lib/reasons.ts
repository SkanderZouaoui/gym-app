/** Motifs de refus d'un pointage — mêmes libellés que l'application mobile. */
export const REASON_LABEL: Record<string, string> = {
  TOKEN_INVALID: "QR non reconnu",
  TOKEN_EXPIRED: "QR expiré",
  TOKEN_REPLAYED: "QR déjà utilisé",
  SCANNER_NOT_AUTHORIZED: "Scan non autorisé",
  SESSION_CANCELLED: "Cours annulé",
  OUTSIDE_WINDOW: "Pointage fermé pour ce cours",
  NO_BOOKING: "Pas de réservation",
  MEMBER_NOT_FOUND: "Code inconnu",
  BOOKING_WAITLISTED: "Sur liste d'attente",
  BOOKING_CANCELLED: "Réservation annulée",
  ALREADY_CHECKED_IN: "Déjà pointé",
  NO_MEMBERSHIP: "Aucun abonnement",
  MEMBERSHIP_EXPIRED: "Abonnement expiré",
  MEMBERSHIP_SUSPENDED: "Abonnement suspendu",
  SESSION_FULL: 'Cours complet',
  NO_SHOW_PENALTY_ACTIVE: 'Pénalité d’absence en cours',
}

export const REASON_HINT: Record<string, string> = {
  NO_BOOKING: "Cet adhérent n’a pas réservé ce cours.",
  MEMBER_NOT_FOUND: "Aucun adhérent n’a ce code. Vérifiez-le ou cherchez par nom.",
  BOOKING_WAITLISTED: "Il est sur liste d’attente : aucune place ne s’est libérée.",
  BOOKING_CANCELLED: "L’adhérent a annulé sa réservation pour ce cours.",
  ALREADY_CHECKED_IN: "Sa présence à ce cours est déjà enregistrée.",
  NO_MEMBERSHIP: "Proposez-lui de souscrire un abonnement à la caisse.",
  MEMBERSHIP_EXPIRED: "Son abonnement est terminé : à renouveler à la caisse.",
  MEMBERSHIP_SUSPENDED: "Son abonnement est suspendu. Voir avec l’administration.",
  SESSION_CANCELLED: "Ce cours a été annulé, personne ne peut être pointé.",
}
