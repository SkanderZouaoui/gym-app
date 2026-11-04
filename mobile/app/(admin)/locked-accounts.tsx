import { LockedAccountsScreen } from '../../src/components/staff/LockedAccountsScreen';

/** Comptes adhérents bloqués (admin) : débloquer, réinitialiser le mot de passe, réactiver un compte désactivé. */
export default function AdminLockedAccountsRoute() {
  return <LockedAccountsScreen fallbackHref="/(admin)/(tabs)/members" />;
}
