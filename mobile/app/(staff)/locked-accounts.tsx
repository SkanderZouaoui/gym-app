import { LockedAccountsScreen } from '../../src/components/staff/LockedAccountsScreen';

/** Comptes adhérents bloqués (accueil) : débloquer, réinitialiser le mot de passe. */
export default function StaffLockedAccountsRoute() {
  return <LockedAccountsScreen fallbackHref="/(staff)/(tabs)/members" />;
}
