import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useTabBarStore } from '../store/tabBar';

const HIDE_AFTER = 60;
const THRESHOLD = 6;

/** Props de scroll à étaler sur un ScrollView/FlatList d'onglet : masque la barre
 * flottante au-delà de 60 pt vers le bas, la réaffiche au retour vers le haut. */
export function useHideTabBarOnScroll() {
  const lastY = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, e.nativeEvent.contentOffset.y);
    const dy = y - lastY.current;
    const { setHidden } = useTabBarStore.getState();
    if (y <= HIDE_AFTER) setHidden(false);
    else if (dy > THRESHOLD) setHidden(true);
    else if (dy < -THRESHOLD) setHidden(false);
    lastY.current = y;
  }, []);
  return { onScroll, scrollEventThrottle: 16 } as const;
}
