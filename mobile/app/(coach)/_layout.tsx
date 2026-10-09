import { Stack } from 'expo-router';

/** Pile de navigation Coach : les 5 onglets vivent dans (tabs) (Tabs natif),
 * tous les écrans de détail sont poussés ici en tant que vrais écrans de Stack —
 * ça donne un historique réel (router.canGoBack()/back() fonctionnent) et active
 * le swipe-back iOS par défaut (gestureEnabled), contrairement à l'ancienne
 * structure où tout vivait à plat dans le même Tabs navigator. */
export default function CoachStackLayout() {
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
