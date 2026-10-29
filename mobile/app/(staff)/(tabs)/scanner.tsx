import { useLocalSearchParams } from 'expo-router';
import { ScannerScreen } from '../../../src/components/ScannerScreen';
import { useStaffToday } from '../../../src/hooks/useStaff';

export default function StaffScannerScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { data } = useStaffToday();
  return (
    <ScannerScreen
      sessions={data?.sessions.map((s) => ({ id: s.id, name: s.classTypeName, startsAt: s.startsAt, endsAt: s.endsAt }))}
      initialSessionId={params.sessionId}
      emptyText="Aucun cours aujourd’hui à scanner."
    />
  );
}
