import { useEffect, useState } from 'react';
import { AppState, Keyboard, Platform } from 'react-native';

/** Hauteur du clavier (0 si masqué). Android seulement : en edge-to-edge la fenêtre ne se redimensionne plus. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height > 80 ? e.endCoordinates.height : 0));
    const frame = Keyboard.addListener('keyboardDidChangeFrame', (e) => setHeight(e.endCoordinates.height > 80 && Keyboard.isVisible() ? e.endCoordinates.height : 0));
    // Filet de sécurité : si l'évènement de fermeture est manqué, on resynchronise à chaque retour au premier plan.
    const app = AppState.addEventListener('change', () => {
      if (!Keyboard.isVisible()) setHeight(0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
      frame.remove();
      app.remove();
    };
  }, []);
  return height;
}
