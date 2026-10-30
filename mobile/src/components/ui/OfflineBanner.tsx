import { Banner } from './Banner';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../../i18n';

/** Bannière "hors ligne, données du [date] à [heure]" — états communs des écrans d'accueil. */
export function OfflineBanner({ lastSyncAt }: { lastSyncAt: number | null }) {
  const { t } = useTranslation();
  const syncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString(dateLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Banner
      tone="warning"
      icon="wifi-off"
      title={t('common.hors_ligne')}
      text={syncLabel ? t('common.donnees_du', { syncLabel }) : t('common.en_attente_de_la_premiere')}
    />
  );
}
