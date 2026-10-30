import { useLocalSearchParams } from 'expo-router';
import { ScannerScreen } from '../../../src/components/ScannerScreen';
import { useStaffToday } from '../../../src/hooks/useStaff';
import { useTranslation } from 'react-i18next';

export default function StaffScannerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { data } = useStaffToday();
  return (
    <ScannerScreen
      sessions={data?.sessions.map((s) => ({ id: s.id, name: s.classTypeName, startsAt: s.startsAt, endsAt: s.endsAt }))}
      initialSessionId={params.sessionId}
      emptyText={t('common.aucun_cours_aujourdhui_a_scanner')}
    />
  );
}
