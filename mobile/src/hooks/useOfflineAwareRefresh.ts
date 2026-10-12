import { useState } from 'react';
import { useNetworkStatusContext } from './NetworkStatusContext';

/** Pull-to-refresh qui prévient par un toast plutôt que de rafraîchir silencieusement
 * sans rien faire quand l'appareil est hors-ligne (le fetch serait de toute façon mis
 * en pause par React Query avec networkMode: 'online'). */
export function useOfflineAwareRefresh(refetch: () => Promise<unknown>) {
  const { isOnline } = useNetworkStatusContext();
  const [refreshing, setRefreshing] = useState(false);
  const [offlineToastVisible, setOfflineToastVisible] = useState(false);

  const onRefresh = async () => {
    if (!isOnline) {
      setOfflineToastVisible(true);
      setTimeout(() => setOfflineToastVisible(false), 2500);
      return;
    }
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return { refreshing, offlineToastVisible, onRefresh };
}
