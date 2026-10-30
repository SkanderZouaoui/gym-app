import { RoleProfileScreen } from '../../../src/components/RoleProfileScreen';
import { useTranslation } from 'react-i18next';

export default function CoachProfileScreen() {
  const { t } = useTranslation();
  return <RoleProfileScreen roleLabel={t('common.coach')} />;
}
