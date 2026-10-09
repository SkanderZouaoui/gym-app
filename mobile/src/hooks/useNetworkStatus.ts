import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getItem, setItem } from '../api/storage';

const LAST_SYNC_KEY = 'muscleup.lastSyncAt';

/**
 * État réseau courant + horodatage de la dernière fois que des données
 * fraîches ont été reçues du serveur — pour les bannières "hors ligne,
 * données du [date] à [heure]" (section accueil, états communs).
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    getItem(LAST_SYNC_KEY).then((raw) => {
      const parsed = raw ? Number(raw) : null;
      if (parsed && Number.isFinite(parsed)) setLastSyncAt(parsed);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online) {
        const now = Date.now();
        setLastSyncAt(now);
        void setItem(LAST_SYNC_KEY, String(now));
      }
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, lastSyncAt };
}
