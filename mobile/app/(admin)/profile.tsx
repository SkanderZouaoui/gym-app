import { RoleProfileScreen } from '../../src/components/RoleProfileScreen';
import { useTranslation } from 'react-i18next';

export default function AdminProfileScreen() {
  const { t } = useTranslation();
  return <RoleProfileScreen roleLabel={t('admin.admin')} />;
}
