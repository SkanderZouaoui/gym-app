import { Banner } from './Banner';

/** Bannière "hors ligne, données du [date] à [heure]" — états communs des écrans d'accueil. */
export function OfflineBanner({ lastSyncAt }: { lastSyncAt: number | null }) {
  const syncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Banner
      tone="warning"
      icon="wifi-off"
      title="Hors ligne"
      text={syncLabel ? `Données du ${syncLabel}` : 'En attente de la première synchronisation.'}
    />
  );
}
