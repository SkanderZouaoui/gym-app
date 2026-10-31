import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedView, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import { blurhashRgba } from '../../utils/blurhash';
import { ZoomableImage } from './ZoomableImage';
import type { GalleryPhoto, PhotoOrigin } from './photos';

const THUMB = 52;
const OPEN_MS = 280;
const CLOSE_MS = 180;

interface Props {
  visible: boolean;
  photos: GalleryPhoto[];
  startIndex: number;
  /** Position de la vignette touchée : la photo s'agrandit depuis cet endroit. */
  origin: PhotoOrigin | null;
  onClose: () => void;
  /** Photo affichée à la fermeture (le carrousel s'y recale). */
  onIndexChange?: (index: number) => void;
}

/** Visionneuse plein écran : zoom, déplacement, fermeture par glissement, rail de miniatures, partage. */
export function GalleryViewer({ visible, ...rest }: Props) {
  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={rest.onClose}>
      {/* Dans une modale, les gestes ont besoin de leur propre racine (Android). */}
      <GestureHandlerRootView style={styles.root}>{visible ? <ViewerBody {...rest} /> : null}</GestureHandlerRootView>
    </Modal>
  );
}

function ViewerBody({ photos, startIndex, origin, onClose, onIndexChange }: Omit<Props, 'visible'>) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Dans une modale, SafeAreaView ne reçoit pas les marges : on les applique à la main (barre d'état / encoche, barre de gestes).
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0);
  const pagerTop = topInset + 64;
  const pagerHeight = Math.round(height * 0.66);

  const [current, setCurrent] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [ready, setReady] = useState(!origin);
  const [sharing, setSharing] = useState(false);
  const listRef = useRef<FlatList<GalleryPhoto>>(null);
  const railRef = useRef<FlatList<GalleryPhoto>>(null);
  const closing = useRef(false);
  const dismissY = useSharedValue(0);
  const setDismissY = (y: number, animated?: boolean) => {
    'worklet';
    dismissY.value = animated ? withSpring(y) : y;
  };
  const [fade] = useState(() => new Animated.Value(0));
  const [grow] = useState(() => new Animated.Value(origin ? 0 : 1));

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: OPEN_MS, useNativeDriver: true }).start();
    if (origin) Animated.timing(grow, { toValue: 1, duration: OPEN_MS, useNativeDriver: false }).start(() => setReady(true));
  }, [fade, grow, origin]);

  // Le rail de miniatures suit la photo affichée.
  useEffect(() => {
    railRef.current?.scrollToIndex({ index: current, animated: true, viewPosition: 0.5 });
  }, [current]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    onIndexChange?.(current);
    Animated.timing(fade, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }).start(onClose);
  };

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('SHARING_UNAVAILABLE');
      const file = await File.downloadFileAsync(photos[current].url, new File(Paths.cache, `muscleup-${Date.now()}.jpg`));
      await Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
      file.delete();
    } catch {
      Alert.alert(t('member.photo_partage_impossible'));
    } finally {
      setSharing(false);
    }
  };

  // Pendant le glissement vers le bas, le fond s'estompe.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dismissY.value), [0, 260], [1, 0.25], Extrapolation.CLAMP),
  }));

  const photo = photos[current];
  const target = { x: 0, y: pagerTop, w: width, h: pagerHeight };

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      <ReanimatedView.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        {/* Fond : la photo courante, très floutée, teintée de sa couleur dominante. */}
        <Image source={{ uri: photo.thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={Platform.OS === 'ios' ? 60 : 25} />
        <View style={styles.veil} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: blurhashRgba(photo.blurhash, 0.22, 'transparent') }]} />
      </ReanimatedView.View>

      <View style={{ flex: 1, paddingTop: topInset, paddingBottom: insets.bottom }}>
        <View style={styles.top}>
          <View style={styles.counter}>
            <Text style={styles.counterText}>{current + 1} / {photos.length}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.round} onPress={share} hitSlop={8} accessibilityLabel={t('member.photo_partager')}>
              <MaterialIcons name={sharing ? 'hourglass-top' : 'ios-share'} size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.round} onPress={close} hitSlop={8} accessibilityLabel={t('member.fermer')}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(p) => p.url}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== current) haptics.selection();
            setCurrent(i);
          }}
          style={[styles.pager, { opacity: ready ? 1 : 0 }]}
          renderItem={({ item }) => (
            <ZoomableImage photo={item} width={width} height={pagerHeight} dismissY={dismissY} setDismissY={setDismissY} onZoomChange={setZoomed} onClose={close} />
          )}
        />

        {photos.length > 1 ? (
          <FlatList
            ref={railRef}
            data={photos}
            keyExtractor={(p) => p.url}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.rail, { opacity: ready ? 1 : 0 }]}
            contentContainerStyle={styles.railContent}
            getItemLayout={(_, index) => ({ length: THUMB + 10, offset: (THUMB + 10) * index, index })}
            onScrollToIndexFailed={() => undefined}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => {
                  setCurrent(index);
                  listRef.current?.scrollToIndex({ index, animated: true });
                  haptics.selection();
                }}
                style={[styles.thumbBtn, index === current && styles.thumbBtnActive]}
                accessibilityLabel={t('member.photo_sur', { v0: index + 1, length: photos.length })}
              >
                <Image source={{ uri: item.thumbUrl }} style={styles.thumbImg} contentFit="cover" />
                {index !== current ? <View style={styles.thumbDim} /> : null}
              </Pressable>
            )}
          />
        ) : null}
      </View>

      {/* Transition : la photo touchée s'agrandit depuis sa vignette jusqu'à sa place dans la visionneuse. */}
      {!ready && origin ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            overflow: 'hidden',
            borderRadius: grow.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
            left: grow.interpolate({ inputRange: [0, 1], outputRange: [origin.x, target.x] }),
            top: grow.interpolate({ inputRange: [0, 1], outputRange: [origin.y, target.y] }),
            width: grow.interpolate({ inputRange: [0, 1], outputRange: [origin.width, target.w] }),
            height: grow.interpolate({ inputRange: [0, 1], outputRange: [origin.height, target.h] }),
          }}
        >
          <Image source={{ uri: photos[startIndex].thumbUrl }} placeholder={photos[startIndex].blurhash ? { blurhash: photos[startIndex].blurhash! } : undefined} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  veil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.62)' },
  top: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  counter: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  counterText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: 10 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  pager: { flexGrow: 0 },
  rail: { flexGrow: 0, marginTop: 14 },
  railContent: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  thumbBtn: { width: THUMB, height: THUMB, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbBtnActive: { borderColor: '#FFFFFF', transform: [{ scale: 1.08 }] },
  thumbImg: { width: '100%', height: '100%' },
  thumbDim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
});
