import { useLocalSearchParams } from 'expo-router';
import { ScannerScreen } from '../../src/components/ScannerScreen';
import { useCoachSessions } from '../../src/hooks/useCoachSessions';

export default function CoachScannerScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { data } = useCoachSessions();
  const today = new Date().toDateString();
  const sessions = (data ?? [])
    .filter((s) => new Date(s.startsAt).toDateString() === today)
    .map((s) => ({ id: s.id, name: s.classType.name, startsAt: s.startsAt, endsAt: s.endsAt }));
  return <ScannerScreen sessions={sessions} initialSessionId={params.sessionId} emptyText="Aucun cours disponible à scanner." />;
}
