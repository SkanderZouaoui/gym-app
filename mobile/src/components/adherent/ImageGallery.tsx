import { useEffect, useMemo, useRef, useState } from 'react';
import { haptics } from '../../utils/haptics';
import { Animated, FlatList, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SkeletonShimmer } from '../ui/Skeleton';

interface ImageGalleryProps {
  urls: string[];
}

const GAP = 12;
const SIDE = spacing.lg; // marge de l'écran : la carte suivante dépasse pour inviter au balayage

/** Une seule photo : pleine largeur ; sinon ~82 % de l'écran pour laisser deviner la suivante. */
const tileWidthFor = (screenWidth: number, count: number) => (count === 1 ? screenWidth - SIDE * 2 : Math.min(screenWidth * 0.82, 360));

/** Galerie de photos d'un cours : carrousel aimanté (la photo suivante dépasse), pastille « 2/5 », points de progression,
 * puis visionneuse plein écran (balayage horizontal entre les photos, compteur, bouton de fermeture). */
export function ImageGallery({ urls }: ImageGalleryProps) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Dans une modale, SafeAreaView ne reçoit pas les marges : on les applique à la main (barre d'état / encoche, barre de gestes).
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [scrollX] = useState(() => new Animated.Value(0));
  const lastTick = useRef(0);
  const listRef = useRef<FlatList<string>>(null);
  // Images dont le chargement est terminé (réussi ou en échec) : tant qu'elles n'y sont pas, un squelette animé les remplace.
  const [settled, setSettled] = useState<Record<string, 'ok' | 'error'>>({});
  const settle = (url: string, state: 'ok' | 'error') => setSettled((s) => (s[url] === state ? s : { ...s, [url]: state }));

  // Léger tic haptique à chaque changement de photo.
  const interval = tileWidthFor(width, urls.length) + GAP;
  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      const idx = Math.round(value / interval);
      if (idx !== lastTick.current) {
        lastTick.current = idx;
        haptics.selection();
      }
    });
    return () => scrollX.removeListener(id);
  }, [scrollX, interval]);

  if (urls.length === 0) return null;

  // Une seule photo : pleine largeur ; sinon ~82 % de l'écran pour laisser deviner la suivante.
  const tileWidth = tileWidthFor(width, urls.length);
  const tileHeight = Math.round(tileWidth * 0.64);

  const open = (index: number) => {
    setCurrent(index);
    setOpenIndex(index);
  };

  return (
    <>
      <Animated.ScrollView
        horizontal
        style={styles.bleed}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        snapToInterval={interval}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
      >
        {urls.map((url, i) => {
          // La photo centrée est pleine, ses voisines reculent légèrement (échelle + opacité).
          const range = [(i - 1) * interval, i * interval, (i + 1) * interval];
          const scale = scrollX.interpolate({ inputRange: range, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
          return (
            <Animated.View key={url} style={{ transform: [{ scale }], opacity }}>
              <Pressable
                onPress={() => open(i)}
                style={({ pressed }) => [styles.tile, cardShadow, { width: tileWidth, height: tileHeight }, pressed && { opacity: 0.92 }]}
                accessibilityLabel={t('member.photo_sur', { v0: i + 1, length: urls.length })}
              >
                <Image source={{ uri: url }} style={styles.tileImage} contentFit="cover" transition={300} onLoad={() => settle(url, 'ok')} onError={() => settle(url, 'error')} />
                {!settled[url] ? <SkeletonShimmer radius={26} /> : null}
                {settled[url] === 'error' ? (
                  <View style={styles.errorOverlay}>
                    <MaterialIcons name="broken-image" size={30} color={colors.muted} />
                  </View>
                ) : null}
                {settled[url] === 'ok' ? (
                  <>
                    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} style={styles.tileShade} pointerEvents="none" />
                    {urls.length > 1 ? (
                      <BlurView intensity={30} tint="dark" style={styles.glass}>
                        <Text style={styles.badgeText}>{String(i + 1).padStart(2, '0')}<Text style={styles.badgeDim}> / {String(urls.length).padStart(2, '0')}</Text></Text>
                      </BlurView>
                    ) : null}
                    <BlurView intensity={30} tint="dark" style={styles.expand}>
                      <MaterialIcons name="open-in-full" size={15} color="#FFFFFF" />
                    </BlurView>
                  </>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {urls.length > 1 ? (
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.thumb,
              {
                width: `${100 / urls.length}%`,
                transform: [{ translateX: scrollX.interpolate({ inputRange: [0, interval * (urls.length - 1)], outputRange: [0, 120 * (1 - 1 / urls.length)], extrapolate: 'clamp' }) }],
              },
            ]}
          />
        </View>
      ) : null}

      <Modal visible={openIndex !== null} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setOpenIndex(null)}>
        <View style={styles.viewer}>
          <View style={{ flex: 1, paddingTop: topInset, paddingBottom: insets.bottom }}>
            <View style={styles.viewerTop}>
              <View style={styles.counter}>
                <Text style={styles.counterText}>{current + 1} / {urls.length}</Text>
              </View>
              <Pressable style={styles.close} onPress={() => setOpenIndex(null)} hitSlop={10} accessibilityLabel={t('member.fermer')}>
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            <FlatList
              ref={listRef}
              data={urls}
              keyExtractor={(u) => u}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={openIndex ?? 0}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <Pressable style={{ width, height: height * 0.75, justifyContent: 'center' }} onPress={() => setOpenIndex(null)}>
                  <Image source={{ uri: item }} style={{ width, height: height * 0.7 }} contentFit="contain" transition={250} onLoad={() => settle(item, 'ok')} onError={() => settle(item, 'error')} />
                  {!settled[item] ? (
                    <View style={styles.viewerSkeleton}>
                      <SkeletonShimmer radius={radii.lg} dark />
                    </View>
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    bleed: { marginHorizontal: -SIDE }, // le carrousel déborde des marges de l'écran, comme un fil d'actualité
    row: { gap: GAP, paddingVertical: 4, paddingHorizontal: SIDE },
    tile: { borderRadius: 26, overflow: 'hidden', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
    tileShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
    glass: { position: 'absolute', top: 12, end: 12, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.25)' },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, color: '#FFFFFF' },
    badgeDim: { color: 'rgba(255,255,255,0.65)' },
    expand: { position: 'absolute', bottom: 12, end: 12, width: 32, height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
    track: { alignSelf: 'center', width: 120, height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden', marginTop: 6 },
    thumb: { height: 3, borderRadius: 2, backgroundColor: colors.primary },
    tileImage: { width: '100%', height: '100%' },
    errorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
    viewerSkeleton: { position: 'absolute', alignSelf: 'center', width: '88%', height: '55%', top: '12%' },
    viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
    viewerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
    counter: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    counterText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
    close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  });
}
