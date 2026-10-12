import { createContext, useContext, type ReactNode } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

interface NetworkStatusContextValue {
  isOnline: boolean;
  lastSyncAt: number | null;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);

/** Monté une seule fois (ex. app/(member)/_layout.tsx) pour partager un seul état réseau entre tous les écrans membre. */
export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const status = useNetworkStatus();
  return <NetworkStatusContext.Provider value={status}>{children}</NetworkStatusContext.Provider>;
}

export function useNetworkStatusContext(): NetworkStatusContextValue {
  const ctx = useContext(NetworkStatusContext);
  if (!ctx) throw new Error('useNetworkStatusContext must be used within a NetworkStatusProvider');
  return ctx;
}
