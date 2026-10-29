import { useLocalSearchParams } from 'expo-router';
import { ScannerScreen } from '../../../src/components/ScannerScreen';
import { useSessions } from '../../../src/hooks/useClasses';

export default function AdminScannerScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { data } = useSessions();
  const today = new Date().toDateString();
  const sessions = (data ?? [])
    .filter((s) => new Date(s.startsAt).toDateString() === today)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map((s) => ({ id: s.id, name: s.classType.name, startsAt: s.startsAt, endsAt: s.endsAt }));
  return <ScannerScreen sessions={sessions} initialSessionId={params.sessionId} emptyText="Aucun cours aujourd’hui à scanner." />;
}
