import { Redirect, Stack } from 'expo-router';
import { useSessionStore } from '../../src/store/session';
import { onboardingSkipped } from '../../src/store/onboardingSkip';
import { usePrefetchOfflineData } from '../../src/hooks/usePrefetchOfflineData';

/** Pile de navigation Adhérent : les 5 onglets vivent dans (tabs) (Tabs natif),
 * tous les écrans de détail sont poussés ici en tant que vrais écrans de Stack —
 * ça donne un historique réel (router.canGoBack()/back() fonctionnent) et active
 * le swipe-back iOS par défaut (gestureEnabled), contrairement à l'ancienne
 * structure où tout vivait à plat dans le même Tabs navigator. */
export default function MemberStackLayout() {
  return <MemberStackInner />;
}

function MemberStackInner() {
  usePrefetchOfflineData();
  const onboardedAt = useSessionStore((s) => s.user?.onboardedAt);
  // Tant que l'objectif et le profil physique ne sont pas remplis, l'onboarding revient à chaque connexion (« Passer » ne vaut que pour la session).
  if (onboardedAt === null && !onboardingSkipped.value) return <Redirect href={'/onboarding' as any} />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
