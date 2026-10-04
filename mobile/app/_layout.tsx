import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { useSessionStore } from '../src/store/session';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

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
  const setSession = useSessionStore((s) => s.setSession);

  useEffect(() => {
    (async () => {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        try {
          const user = await meApi.getMe();
          const activeRole = user.branchRoles[0]?.role ?? 'MEMBER';
          setSession(user, user.branchRoles, activeRole);
        } catch {
          await tokenStorage.clear();
        }
      }
      setBootstrapped(true);
    })();
  }, [setSession]);

  useEffect(() => {
    if (fontsLoaded && bootstrapped) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, bootstrapped]);

  if (!fontsLoaded || !bootstrapped) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
