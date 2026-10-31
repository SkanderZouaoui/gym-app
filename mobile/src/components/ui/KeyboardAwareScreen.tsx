import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';

/** Appelé par TextField quand un champ prend le focus : l'écran fait remonter ce champ au-dessus du clavier. */
export const KeyboardScrollContext = createContext<() => void>(() => undefined);

/** Permet à un enfant (ex. galerie réordonnable) de suspendre le défilement de l'écran pendant un glissement. */
export const ScrollLockContext = createContext<(enabled: boolean) => void>(() => undefined);

interface Props extends Omit<ScrollViewProps, 'children'> {
  children: ReactNode;
  /** Barre fixe sous le contenu (ex. « Enregistrer ») : affichée clavier fermé, masquée pendant la saisie pour laisser la place. */
  footer?: ReactNode;
}

type FocusedInput = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

/**
 * Écran à formulaire : le clavier ne masque jamais le champ actif.
 * Sans redimensionner la zone de défilement (donc sans saccade) : à l'ouverture du clavier on ajoute en bas du contenu
 * une marge de la hauteur du clavier, puis on fait remonter UNE fois le champ actif juste au-dessus de lui.
 */
export function KeyboardAwareScreen({ children, footer, onScroll, ...scrollProps }: Props) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const ensureFocusedVisible = useCallback(() => {
    const top = keyboardTop.current;
    const input = (TextInput as unknown as { State?: { currentlyFocusedInput?: () => FocusedInput | null } }).State?.currentlyFocusedInput?.();
    if (!top || !input) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overflow = y + h + 28 - (top - 8); // 28 : place pour l'aide / l'erreur sous le champ
      if (overflow > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overflow, animated: true });
    });
  }, []);

  /** Un seul recalage par rafale d'évènements (ouverture du clavier + focus) : évite les à-coups. */
  const schedule = useCallback(
    (delay: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(ensureFocusedVisible, delay);
    },
    [ensureFocusedVisible],
  );

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY || Dimensions.get('window').height - e.endCoordinates.height;
      setKeyboardHeight(e.endCoordinates.height);
      schedule(160); // laisse le temps à la marge basse d'être rendue
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = 0;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [schedule]);

  // Changement de champ clavier ouvert : pas d'évènement clavier, c'est TextField qui nous prévient.
  const onFieldFocus = useCallback(() => schedule(90), [schedule]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  return (
    <KeyboardScrollContext.Provider value={onFieldFocus}>
      <ScrollLockContext.Provider value={setScrollEnabled}>
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          {...scrollProps}
          onScroll={handleScroll}
        >
          {children}
          <View style={{ height: keyboardHeight }} />
        </ScrollView>
        {keyboardHeight === 0 ? footer : null}
      </View>
      </ScrollLockContext.Provider>
    </KeyboardScrollContext.Provider>
  );
}
