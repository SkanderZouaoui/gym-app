import { SessionDetailScreen } from '../../../src/components/SessionDetailScreen';

/** Détail d'un cours (admin) : infos, photos, inscrits, pointage, et accès à la modification du cours. */
export default function AdminSessionDetailScreen() {
  return (
    <SessionDetailScreen
      fallbackHref="/(admin)/(tabs)/planning"
      scannerRoute="/(admin)/(tabs)/scanner"
      memberRoute="/(admin)/member/[id]"
      editRoute="/(admin)/course-form"
    />
  );
}
