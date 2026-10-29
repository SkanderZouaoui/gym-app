import { Stack } from 'expo-router';

/** Pile de navigation Accueil : les onglets vivent dans (tabs), les écrans de détail (fiche adhérent,
 * création de compte, encaissement, reçu) sont poussés ici pour garder un vrai historique de navigation. */
export default function StaffStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
