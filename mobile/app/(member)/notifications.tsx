import { TeamNotificationsScreen } from '../../src/components/TeamNotificationsScreen';

/** Même présentation que l'équipe : notifications, annonces et alertes (passées comprises). */
export default function NotificationsScreen() {
  return <TeamNotificationsScreen fallbackHref="/(member)/(tabs)/profile" />;
}
