import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Hauteur du clavier (0 si masqué). Android seulement : en edge-to-edge la fenêtre ne se redimensionne plus. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
