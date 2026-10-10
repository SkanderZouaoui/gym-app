import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_APP_CONFIG_CONTENT, type AppConfigContent } from '@muscleup/shared';
import { configApi } from '../api/endpoints';
import { getItem, setItem } from '../api/storage';

const CONFIG_CACHE_KEY = 'muscleup.remoteConfig';
const CONFIG_QUERY_KEY = ['remote-config'] as const;

type PublicAppConfig = AppConfigContent & { version: number; publishedAt: string | null };

interface RemoteConfigContextValue {
  config: PublicAppConfig;
  isLoading: boolean;
  refresh: () => void;
}

const RemoteConfigContext = createContext<RemoteConfigContextValue | null>(null);

/**
 * Configuration publiée par le back-office (branding, accueil, navigation,
 * textes, règles) — récupérée au démarrage via react-query (même mécanisme
 * de fetch/cache que le reste de l'app), avec un cache local en plus pour un
 * premier rendu instantané et une tolérance au hors-ligne. En cas d'échec
 * réseau sans cache, on retombe sur les valeurs par défaut (@muscleup/shared)
 * pour que l'app reste utilisable même si le back-office n'a jamais publié.
 */
export function RemoteConfigProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const hydratedFromCache = useRef(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: async () => {
      const fresh = await configApi.getConfig();
      await setItem(CONFIG_CACHE_KEY, JSON.stringify(fresh));
      return fresh;
    },
    initialData: () => ({ ...DEFAULT_APP_CONFIG_CONTENT, version: 0, publishedAt: null }),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (hydratedFromCache.current) return;
    hydratedFromCache.current = true;
    getItem(CONFIG_CACHE_KEY).then((cached) => {
      if (!cached) return;
      try {
        queryClient.setQueryData(CONFIG_QUERY_KEY, JSON.parse(cached) as PublicAppConfig);
      } catch {
        // cache corrompu — on ignore, le fetch réseau prendra le relais
      }
    });
  }, [queryClient]);

  return (
    <RemoteConfigContext.Provider value={{ config: data!, isLoading, refresh: () => void refetch() }}>
      {children}
    </RemoteConfigContext.Provider>
  );
}

export function useRemoteConfig(): RemoteConfigContextValue {
  const ctx = useContext(RemoteConfigContext);
  if (!ctx) throw new Error('useRemoteConfig must be used within a RemoteConfigProvider');
  return ctx;
}
