import { RoleProfileScreen } from '../../../src/components/RoleProfileScreen';
import { useTranslation } from 'react-i18next';

export default function StaffProfileScreen() {
  const { t } = useTranslation();
  return <RoleProfileScreen roleLabel={t('common.accueil')} />;
}
