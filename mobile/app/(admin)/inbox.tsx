import { TeamNotificationsScreen } from '../../src/components/TeamNotificationsScreen';

/** Boîte de réception de l'admin : encaissements, nouveaux comptes, annonces et alertes. */
export default function AdminInboxScreen() {
  return <TeamNotificationsScreen fallbackHref="/(admin)/(tabs)" />;
}
