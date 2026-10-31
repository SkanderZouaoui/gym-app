import { SessionDetailScreen } from '../../../src/components/SessionDetailScreen';

/** Détail d'un cours (coach). */
export default function CoachSessionDetailScreen() {
  return <SessionDetailScreen fallbackHref="/(coach)/(tabs)/planning" scannerRoute="/(coach)/(tabs)/scanner" memberRoute="/(coach)/member/[id]" />;
}
