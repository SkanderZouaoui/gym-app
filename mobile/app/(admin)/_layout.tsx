import { Stack } from 'expo-router';

/** Pile de navigation Admin : les onglets vivent dans (tabs), tous les écrans de détail et de gestion
 * (adhérents, caisse, programmes, alertes, abonnements…) sont poussés ici pour garder un vrai historique. */
export default function AdminStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
