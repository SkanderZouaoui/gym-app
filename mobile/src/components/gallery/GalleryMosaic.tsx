import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../theme/tokens';
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
  const extra = photos.length - 3;

  const tile = (index: number, flex: number, key?: string) => (
    <Pressable
      key={key ?? index}
      ref={(r) => {
        refs.current[index] = r;
      }}
      onPress={() => refs.current[index]?.measureInWindow((x, y, w, h) => onOpen(index, { x, y, width: w, height: h }))}
      style={({ pressed }) => [styles.tile, cardShadow, { flex, backgroundColor: colors.surface2, borderColor: colors.border }, pressed && { opacity: 0.9 }]}
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

  if (photos.length === 1) return <View style={[styles.row, { height: HEIGHT }]}>{tile(0, 1)}</View>;
  if (photos.length === 2) return <View style={[styles.row, { height: HEIGHT }]}>{tile(0, 1)}{tile(1, 1)}</View>;
  return (
    <View style={[styles.row, { height: HEIGHT }]}>
      {tile(0, 1.45)}
      <View style={[styles.column, { flex: 1 }]}>
        {tile(1, 1)}
        {tile(2, 1)}
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
