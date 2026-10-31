import { MemberProfileScreen } from '../../../src/components/staff/MemberProfileScreen';

/** Profil adhérent (coach) : même fiche que l'accueil, sans abonnement, encaissement ni paiements. */
export default function CoachMemberScreen() {
  return <MemberProfileScreen variant="coach" />;
}
