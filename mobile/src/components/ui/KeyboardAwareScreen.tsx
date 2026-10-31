import { createContext, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

/** Appelé par TextField quand un champ prend le focus : l'écran fait remonter ce champ au-dessus du clavier. */
export const KeyboardScrollContext = createContext<() => void>(() => undefined);

interface Props extends Omit<ScrollViewProps, 'children'> {
  children: ReactNode;
  /** Barre fixe sous le contenu (ex. bouton « Enregistrer ») : reste visible au-dessus du clavier. */
  footer?: ReactNode;
}

/**
 * Écran à formulaire : le clavier ne masque jamais le champ actif.
 *  - agencement en colonne (contenu défilant + pied de page fixe), la colonne rétrécit quand le clavier s'ouvre
 *    (iOS : KeyboardAvoidingView ; Android edge-to-edge : marge basse = hauteur du clavier) ;
 *  - le champ qui prend le focus est ramené dans la zone visible.
 */
export function KeyboardAwareScreen({ children, footer, onScroll, ...scrollProps }: Props) {
  const androidKeyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);

  const ensureFocusedVisible = useCallback(() => {
    const input = (TextInput as unknown as { State?: { currentlyFocusedInput?: () => { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null } }).State?.currentlyFocusedInput?.();
    const scroll = scrollRef.current as unknown as { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null;
    if (!input || !scroll?.measureInWindow) return;
    scroll.measureInWindow((_sx, sy, _sw, sh) => {
      input.measureInWindow((_ix, iy, _iw, ih) => {
        const margin = 24;
        const bottomLimit = sy + sh - margin;
        const topLimit = sy + margin;
        if (iy + ih > bottomLimit) scrollRef.current?.scrollTo({ y: scrollY.current + (iy + ih - bottomLimit), animated: true });
        else if (iy < topLimit) scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current - (topLimit - iy)), animated: true });
      });
    });
  }, []);

  // Le clavier vient de s'ouvrir : la colonne se redimensionne, puis on recale le champ actif (deux passes, le temps du layout).
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(ensureFocusedVisible, 60);
      setTimeout(ensureFocusedVisible, 300);
    });
    return () => sub.remove();
  }, [ensureFocusedVisible]);

  // Changement de champ clavier ouvert : pas d'évènement clavier, c'est TextField qui nous prévient.
  const onFieldFocus = useCallback(() => {
    setTimeout(ensureFocusedVisible, 160);
  }, [ensureFocusedVisible]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  return (
    <KeyboardScrollContext.Provider value={onFieldFocus}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingBottom: androidKeyboardHeight }}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEventThrottle={16}
            {...scrollProps}
            onScroll={handleScroll}
          >
            {children}
          </ScrollView>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </KeyboardScrollContext.Provider>
  );
}
