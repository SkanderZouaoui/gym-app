import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture, useExclusiveGestures } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { SkeletonShimmer } from '../ui/Skeleton';
import type { GalleryPhoto } from './photos';

const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

interface Props {
  photo: GalleryPhoto;
  width: number;
  height: number;
  /** Décalage vertical partagé avec la visionneuse : fait glisser la photo et s'estompe le fond pendant la fermeture. */
  dismissY: SharedValue<number>;
  /** Déplace la photo pendant la fermeture par glissement (`animated` : retour en douceur à 0). */
  setDismissY: (y: number, animated?: boolean) => void;
  /** Le zoom est actif : la visionneuse suspend le défilement horizontal entre photos. */
  onZoomChange: (zoomed: boolean) => void;
  onClose: () => void;
}

/**
 * Photo plein écran : pincement pour zoomer (jusqu'à ×5), double appui pour basculer ×1 / ×2,5, déplacement quand elle est
 * zoomée, glissement vers le bas pour fermer (quand elle ne l'est pas), simple appui pour fermer.
 */
export function ZoomableImage({ photo, width, height, dismissY, setDismissY, onZoomChange, onClose }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const setZoom = (z: boolean) => {
    setZoomed(z);
    onZoomChange(z);
  };

  const reset = () => {
    'worklet';
    scale.value = withSpring(1);
    savedScale.value = 1;
    tx.value = withSpring(0);
    ty.value = withSpring(0);
    savedTx.value = 0;
    savedTy.value = 0;
    runOnJS(setZoom)(false);
  };

  // Limite le déplacement pour ne jamais sortir l'image de l'écran.
  const clampTranslate = (value: number, s: number, size: number) => {
    'worklet';
    const max = (size * (s - 1)) / 2;
    return Math.min(max, Math.max(-max, value));
  };

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      scale.value = Math.min(MAX_ZOOM, Math.max(1, savedScale.value * e.scale));
    },
    onDeactivate: () => {
      'worklet';
      if (scale.value < 1.05) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      tx.value = clampTranslate(tx.value, scale.value, width);
      ty.value = clampTranslate(ty.value, scale.value, height);
      savedTx.value = tx.value;
      savedTy.value = ty.value;
      runOnJS(setZoom)(true);
    },
  });

  // Zoomée : la photo se déplace.
  const panZoomed = usePanGesture({
    enabled: zoomed,
    minPointers: 1,
    onUpdate: (e) => {
      'worklet';
      tx.value = clampTranslate(savedTx.value + e.translationX, scale.value, width);
      ty.value = clampTranslate(savedTy.value + e.translationY, scale.value, height);
    },
    onDeactivate: () => {
      'worklet';
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    },
  });

  // Non zoomée : un glissement vertical ferme la visionneuse (le glissement horizontal reste au défilement entre photos).
  const panDismiss = usePanGesture({
    enabled: !zoomed,
    activeOffsetY: [-14, 14],
    failOffsetX: [-14, 14],
    onUpdate: (e) => {
      'worklet';
      setDismissY(e.translationY);
    },
    onDeactivate: (e) => {
      'worklet';
      if (Math.abs(e.translationY) > DISMISS_DISTANCE || Math.abs(e.velocityY) > DISMISS_VELOCITY) {
        runOnJS(onClose)();
      } else {
        setDismissY(0, true);
      }
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      if (scale.value > 1.05) {
        reset();
      } else {
        scale.value = withSpring(DOUBLE_TAP_ZOOM);
        savedScale.value = DOUBLE_TAP_ZOOM;
        runOnJS(setZoom)(true);
      }
    },
  });
  const singleTap = useTapGesture({
    onActivate: () => {
      'worklet';
      if (scale.value <= 1.05) runOnJS(onClose)();
    },
  });

  const gesture = useSimultaneousGestures(pinch, panZoomed, panDismiss, useExclusiveGestures(doubleTap, singleTap));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value + (scale.value <= 1.05 ? dismissY.value : 0) }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height, justifyContent: 'center' }}>
        <Animated.View style={style}>
          <Image
            source={{ uri: photo.url }}
            placeholder={{ uri: photo.thumbUrl }}
            style={{ width, height }}
            contentFit="contain"
            transition={250}
            onLoad={() => setLoaded(true)}
          />
        </Animated.View>
        {!loaded ? (
          <View style={styles.skeleton} pointerEvents="none">
            <SkeletonShimmer radius={20} dark />
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  skeleton: { position: 'absolute', alignSelf: 'center', width: '88%', height: '55%', top: '12%' },
});
