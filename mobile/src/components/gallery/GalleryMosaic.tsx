import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { TilePhoto } from './TilePhoto';
import type { GalleryPhoto, PhotoOrigin } from './photos';

type ViewHandle = ComponentRef<typeof View>;
const GAP = 6;
const RADIUS = 22;
const HEIGHT = 230;

interface Props {
  photos: GalleryPhoto[];
  onOpen: (index: number, origin: PhotoOrigin) => void;
}

/**
 * Mosaïque d'aperçu : 1 photo pleine largeur, 2 côte à côte, 3 ou plus = une grande photo à gauche et deux petites
 * empilées à droite, la dernière annonçant « +N » quand il en reste.
 */
export function GalleryMosaic({ photos, onOpen }: Props) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const refs = useRef<Record<number, ViewHandle | null>>({});
  const { width: screenWidth } = useWindowDimensions();
  const extra = photos.length - 3;
  // Dimensions explicites (largeur de l'écran moins les marges) : chaque vignette a toujours une taille nette.
  const total = screenWidth - spacing.lg * 2;
  const half = (total - GAP) / 2;
  const bigW = Math.round((total - GAP) * 0.6);
  const smallW = total - GAP - bigW;
  const smallH = (HEIGHT - GAP) / 2;

  const tile = (index: number, w: number, h: number) => (
    <Pressable
      key={index}
      ref={(r) => {
        refs.current[index] = r;
      }}
      onPress={() => refs.current[index]?.measureInWindow((x, y, w, h) => onOpen(index, { x, y, width: w, height: h }))}
      style={({ pressed }) => [styles.tile, cardShadow, { width: w, height: h, backgroundColor: colors.surface2, borderColor: colors.border }, pressed && { opacity: 0.9 }]}
      accessibilityLabel={t('member.photo_sur', { v0: index + 1, length: photos.length })}
    >
      <TilePhoto photo={photos[index]} radius={RADIUS} />
      {index === 2 && extra > 0 ? (
        <View style={styles.more}>
          <Text style={styles.moreText}>{t('member.galerie_plus_photos', { count: extra })}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  if (photos.length === 1) return <View style={styles.row}>{tile(0, total, HEIGHT)}</View>;
  if (photos.length === 2) return <View style={styles.row}>{tile(0, half, HEIGHT)}{tile(1, half, HEIGHT)}</View>;
  return (
    <View style={styles.row}>
      {tile(0, bigW, HEIGHT)}
      <View style={styles.column}>
        {tile(1, smallW, smallH)}
        {tile(2, smallW, smallH)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP },
  column: { gap: GAP },
  tile: { borderRadius: RADIUS, overflow: 'hidden', borderWidth: 1 },
  more: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fonts.head, fontSize: 24, letterSpacing: -0.5, color: '#FFFFFF' },
});
