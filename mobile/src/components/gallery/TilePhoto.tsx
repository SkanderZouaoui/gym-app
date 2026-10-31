import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { SkeletonShimmer } from '../ui/Skeleton';
import type { GalleryPhoto } from './photos';

/** Miniature d'une photo : aperçu flou (blurhash) pendant le chargement — squelette animé si la photo n'en a pas —,
 * puis fondu vers l'image ; icône discrète en cas d'échec. */
export function TilePhoto({ photo, radius, style }: { photo: GalleryPhoto; radius: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  return (
    <View style={[styles.fill, style]}>
      <Image
        source={{ uri: photo.thumbUrl }}
        placeholder={photo.blurhash ? { blurhash: photo.blurhash } : undefined}
        placeholderContentFit="cover"
        style={styles.fill}
        contentFit="cover"
        transition={300}
        onLoad={() => setState('ok')}
        onError={() => setState('error')}
      />
      {state === 'loading' && !photo.blurhash ? <SkeletonShimmer radius={radius} /> : null}
      {state === 'error' ? (
        <View style={[styles.fill, styles.error, { backgroundColor: colors.surface2 }]}>
          <MaterialIcons name="broken-image" size={28} color={colors.muted} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  error: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
