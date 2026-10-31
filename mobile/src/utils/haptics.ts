import * as Haptics from 'expo-haptics';

/**
 * Retour haptique « sans risque » : sur certains appareils ou clients (Expo Go sur Android, émulateur…) une méthode peut
 * être indisponible et la promesse échoue. La vibration n'est qu'un confort : on ignore l'erreur au lieu de la laisser
 * remonter en « Uncaught in promise ».
 */
async function safely(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch {
    // indisponible sur cet appareil : sans effet
  }
}

export const haptics = {
  /** Léger impact (appui sur un onglet…). */
  light: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Changement de sélection (glisser-déposer, copie…). */
  selection: () => safely(() => Haptics.selectionAsync()),
  success: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
