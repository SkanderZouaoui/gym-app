import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { fonts, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';
import { TilePhoto } from './TilePhoto';
import type { GalleryPhoto, PhotoOrigin } from './photos';

type ViewHandle = ComponentRef<typeof View>;
type ScrollHandle = ComponentRef<typeof Animated.ScrollView>;
const GAP = 12;
const SIDE = spacing.lg; // marge de l'écran : le carrousel déborde de part et d'autre, comme un fil d'actualité
const RADIUS = 26;
const AUTOPLAY_MS = 4500;
const RESUME_MS = 6000;

/** Une seule photo : pleine largeur ; sinon ~82 % de l'écran pour laisser deviner la suivante. */
export const tileWidthFor = (screenWidth: number, count: number) => (count === 1 ? screenWidth - SIDE * 2 : Math.min(screenWidth * 0.82, 360));

interface Props {
  photos: GalleryPhoto[];
  onOpen: (index: number, origin: PhotoOrigin) => void;
  onActiveChange?: (index: number) => void;
  /** Photo à amener au centre (ex. au retour de la visionneuse). */
  focusIndex: number;
  /** Défilement automatique, suspendu au toucher puis repris. */
  autoplay: boolean;
  /** Mis à true quand la visionneuse est ouverte : rien ne doit bouger derrière. */
  paused: boolean;
}

/** Carrousel aimanté : photo centrée pleine, voisines en retrait, parallaxe, pastille « 02 / 05 », barre de progression,
 * défilement automatique et tic haptique à chaque photo. */
export function GalleryCarousel({ photos, onOpen, onActiveChange, focusIndex, autoplay, paused }: Props) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const { width } = useWindowDimensions();
  const [scrollX] = useState(() => new Animated.Value(0));
  const scroller = useRef<ScrollHandle>(null);
  const active = useRef(0);
  const touching = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tiles = useRef<Record<number, ViewHandle | null>>({});

  const tileWidth = tileWidthFor(width, photos.length);
  const tileHeight = Math.round(tileWidth * 0.64);
  const interval = tileWidth + GAP;

  // Tic haptique et mémorisation de la photo centrée à chaque changement.
  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      const idx = Math.max(0, Math.min(photos.length - 1, Math.round(value / interval)));
      if (idx !== active.current) {
        active.current = idx;
        haptics.selection();
        onActiveChange?.(idx);
      }
    });
    return () => scrollX.removeListener(id);
  }, [scrollX, interval, photos.length, onActiveChange]);

  // Recalage demandé par le parent.
  useEffect(() => {
    if (focusIndex !== active.current) scroller.current?.scrollTo({ x: focusIndex * interval, animated: false });
  }, [focusIndex, interval]);

  // Défilement automatique.
  useEffect(() => {
    if (!autoplay || paused || photos.length < 2) return;
    const id = setInterval(() => {
      if (touching.current) return;
      scroller.current?.scrollTo({ x: ((active.current + 1) % photos.length) * interval, animated: true });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [autoplay, paused, photos.length, interval]);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const hold = () => {
    touching.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };
  const release = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      touching.current = false;
    }, RESUME_MS);
  };

  return (
    <View>
      <Animated.ScrollView
        ref={scroller}
        horizontal
        style={styles.bleed}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        snapToInterval={interval}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScrollBeginDrag={hold}
        onScrollEndDrag={release}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
      >
        {photos.map((photo, i) => {
          // La photo centrée est pleine, ses voisines reculent légèrement (échelle + opacité).
          const range = [(i - 1) * interval, i * interval, (i + 1) * interval];
          const scale = scrollX.interpolate({ inputRange: range, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
          const shift = scrollX.interpolate({ inputRange: range, outputRange: [-tileWidth * 0.1, 0, tileWidth * 0.1], extrapolate: 'clamp' });
          return (
            <Animated.View key={photo.url} style={{ transform: [{ scale }], opacity }}>
              <Pressable
                ref={(r) => {
                  tiles.current[i] = r;
                }}
                onPress={() =>
                  tiles.current[i]?.measureInWindow((x, y, w, h) => onOpen(i, { x, y, width: w, height: h }))
                }
                style={({ pressed }) => [styles.tile, cardShadow, { width: tileWidth, height: tileHeight, backgroundColor: colors.surface2, borderColor: colors.border }, pressed && { opacity: 0.92 }]}
                accessibilityLabel={t('member.photo_sur', { v0: i + 1, length: photos.length })}
              >
                {/* L'image est plus large que la carte et glisse à contre-sens du défilement : effet de profondeur. */}
                <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: tileWidth * 1.24, left: -tileWidth * 0.12, transform: [{ translateX: shift }] }}>
                  <TilePhoto photo={photo} radius={RADIUS} />
                </Animated.View>
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} style={styles.shade} pointerEvents="none" />
                {photos.length > 1 ? (
                  <BlurView intensity={30} tint="dark" style={styles.glass}>
                    <Text style={styles.badgeText}>{String(i + 1).padStart(2, '0')}<Text style={styles.badgeDim}> / {String(photos.length).padStart(2, '0')}</Text></Text>
                  </BlurView>
                ) : null}
                <BlurView intensity={30} tint="dark" style={styles.expand}>
                  <MaterialIcons name="open-in-full" size={15} color="#FFFFFF" />
                </BlurView>
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {photos.length > 1 ? (
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: colors.primary,
                width: `${100 / photos.length}%`,
                transform: [{ translateX: scrollX.interpolate({ inputRange: [0, interval * (photos.length - 1)], outputRange: [0, 120 * (1 - 1 / photos.length)], extrapolate: 'clamp' }) }],
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -SIDE },
  row: { gap: GAP, paddingVertical: 4, paddingHorizontal: SIDE },
  tile: { borderRadius: RADIUS, overflow: 'hidden', borderWidth: 1 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  glass: { position: 'absolute', top: 12, end: 12, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.25)' },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, color: '#FFFFFF' },
  badgeDim: { color: 'rgba(255,255,255,0.65)' },
  expand: { position: 'absolute', bottom: 12, end: 12, width: 32, height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  track: { alignSelf: 'center', width: 120, height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  thumb: { height: 3, borderRadius: 2 },
});
