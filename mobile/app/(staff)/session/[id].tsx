import { SessionDetailScreen } from '../../../src/components/SessionDetailScreen';

/** Détail d'un cours (accueil) : infos, présence, inscrits et pointage manuel, liste d'attente. */
export default function StaffSessionDetailScreen() {
  return <SessionDetailScreen fallbackHref="/(staff)/(tabs)/planning" scannerRoute="/(staff)/(tabs)/scanner" memberRoute="/(staff)/member/[id]" />;
}
