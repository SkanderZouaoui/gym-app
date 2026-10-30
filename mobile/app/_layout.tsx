import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, onlineManager, useQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import NetInfo from '@react-native-community/netinfo';
import {
  useFonts,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { tokenStorage } from '../src/api/storage';
import { meApi } from '../src/api/endpoints';
import { ApiError } from '../src/api/client';
import { queryPersister, QUERY_CACHE_VERSION } from '../src/api/queryStorage';
import { usePreferencesStore } from '../src/store/preferences';
import { NetworkStatusProvider } from '../src/hooks/NetworkStatusContext';
import { useSessionStore } from '../src/store/session';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../src/hooks/useKeyboardHeight';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { RemoteConfigProvider } from '../src/config/RemoteConfigContext';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import '../src/i18n';
import { SplashAnimation } from '../src/components/SplashAnimation';

SplashScreen.preventAutoHideAsync();

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected && state.isInternetReachable !== false)),
);

/** Racines de query key dont les données peuvent être persistées sur disque pour un usage hors-ligne. */
const PERSISTED_QUERY_ROOTS = new Set(['me', 'classes', 'programs', 'remote-config', 'exercises']);
/** Sous-clés exclues malgré leur racine persistée : cardinalité illimitée (ex. fenêtre de dates glissante). */
const EXCLUDED_QUERY_SUBKEYS = new Set(['attendance-calendar']);

/** Mutations jamais persistées sur disque (ex. contiennent un secret en mémoire tampon). */
const NON_PERSISTED_MUTATION_KEYS = new Set(['changePassword']);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { networkMode: 'offlineFirst' },
  },
});

const persistOptions = {
  persister: queryPersister,
  buster: QUERY_CACHE_VERSION,
  maxAge: 24 * 60 * 60 * 1000,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) => {
      const [root, subKey, muscleGroup, equipment] = query.queryKey;
      if (query.state.status !== 'success') return false;
      if (typeof root !== 'string' || !PERSISTED_QUERY_ROOTS.has(root)) return false;
      if (typeof subKey === 'string' && EXCLUDED_QUERY_SUBKEYS.has(subKey)) return false;
      if (root === 'exercises' && subKey !== 'detail' && subKey !== 'muscle-groups' && subKey !== 'equipment') {
        // Liste filtrée de la bibliothèque d'exercices : seule la liste sans filtre (celle vue à
        // l'ouverture de l'écran) est persistée, pas chaque combinaison de recherche/filtres.
        const hasFilters = !!subKey || (Array.isArray(muscleGroup) && muscleGroup.length > 0) || (Array.isArray(equipment) && equipment.length > 0);
        if (hasFilters) return false;
      }
      return true;
    },
    shouldDehydrateMutation: (mutation: {
      state: { isPaused: boolean };
      options: { mutationKey?: readonly unknown[] };
    }) => {
      const key = mutation.options.mutationKey?.[0];
      if (typeof key === 'string' && NON_PERSISTED_MUTATION_KEYS.has(key)) return false;
      return mutation.state.isPaused;
    },
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const [bootstrapped, setBootstrapped] = useState(false);
  const [cacheRestored, setCacheRestored] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const setSession = useSessionStore((s) => s.setSession);

  useEffect(() => {
    void usePreferencesStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!cacheRestored) return;
    (async () => {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        try {
          const user = await meApi.getMe();
          const roles = user.roles.map((r) => r.role);
          const activeRole = roles[0] ?? 'MEMBER';
          setSession(user, roles, activeRole);
        } catch (error) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            await tokenStorage.clear();
          } else {
            const cachedUser = queryClient.getQueryData<Awaited<ReturnType<typeof meApi.getMe>>>(['me']);
            if (cachedUser) {
              const roles = cachedUser.roles.map((r) => r.role);
              const activeRole = roles[0] ?? 'MEMBER';
              setSession(cachedUser, roles, activeRole, { degraded: true });
            }
          }
        }
      }
      setBootstrapped(true);
    })();
  }, [cacheRestored, setSession]);

  useEffect(() => {
    // Le splash animé prend le relais du splash natif dès son premier rendu.
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    return onlineManager.subscribe((isOnline) => {
      if (isOnline) void queryClient.resumePausedMutations();
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        onSuccess={() => setCacheRestored(true)}
        onError={() => setCacheRestored(true)}
      >
        {!fontsLoaded || !bootstrapped ? null : (
          <RemoteConfigProvider>
            <LanguageProvider>
              <ThemeProvider>
                <RootLayoutInner />
              </ThemeProvider>
            </LanguageProvider>
          </RemoteConfigProvider>
        )}
      </PersistQueryClientProvider>
      {splashDone ? null : <SplashAnimation ready={fontsLoaded && bootstrapped} onFinish={() => setSplashDone(true)} />}
    </GestureHandlerRootView>
  );
}

/** Android (edge-to-edge) : garde l'app au-dessus de la barre système, et au-dessus du clavier quand il est ouvert. */
function AndroidInsetsFrame({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  if (Platform.OS !== 'android') return <>{children}</>;
  return <View style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: keyboard > 0 ? keyboard : insets.bottom }}>{children}</View>;
}

function RootLayoutInner() {
  const { scheme } = useTheme();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isDegraded = useSessionStore((s) => s.isDegraded);
  const setSession = useSessionStore((s) => s.setSession);
  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: meApi.getMe,
    enabled: isAuthenticated && isDegraded,
  });

  useEffect(() => {
    if (!freshUser) return;
    const roles = freshUser.roles.map((r) => r.role);
    setSession(freshUser, roles, roles[0] ?? 'MEMBER');
  }, [freshUser, setSession]);

  return (
    <NetworkStatusProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AndroidInsetsFrame>
        <Stack screenOptions={{ headerShown: false }} />
      </AndroidInsetsFrame>
    </NetworkStatusProvider>
  );
}
