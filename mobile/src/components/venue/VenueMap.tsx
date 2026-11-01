import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { directionsUrl, tilesAround } from '../../utils/maps';

const ZOOM = 16;

/**
 * Aperçu de carte (tuiles OpenStreetMap, sans SDK de cartographie) centré sur la salle avec une épingle ; un appui ouvre
 * l'itinéraire dans l'application de cartes du téléphone.
 */
export function VenueMap({ latitude, longitude, address, width, height = 180 }: { latitude: number; longitude: number; address?: string; width: number; height?: number }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const tiles = tilesAround({ latitude, longitude }, ZOOM, width, height);
  const url = directionsUrl({ latitude, longitude, address });
  const open = () => url && void Linking.openURL(url);

  return (
    <Pressable onPress={open} style={[styles.wrap, cardShadow, { width, height, borderColor: colors.border, backgroundColor: colors.surface2 }]} accessibilityRole="link" accessibilityLabel={t('venue.map_open')}>
      {tiles.map((tile) => (
        <Image
          key={`${tile.x}/${tile.y}`}
          source={{ uri: `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`, headers: { 'User-Agent': 'MuscleUP-App' } }}
          style={{ position: 'absolute', left: tile.left, top: tile.top, width: 256, height: 256 }}
          transition={150}
        />
      ))}
      <View style={styles.pinWrap} pointerEvents="none">
        <MaterialIcons name="location-on" size={44} color={colors.danger} style={styles.pin} />
      </View>
      <View style={[styles.cta, { backgroundColor: colors.primary }]}>
        <MaterialIcons name="directions" size={18} color={colors.primaryContrast} />
        <Text style={[styles.ctaText, { color: colors.primaryContrast }]}>{t('venue.directions')}</Text>
      </View>
      <Text style={styles.attribution}>{t('venue.map_attribution')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 22, overflow: 'hidden', borderWidth: 1 },
  // La pointe de l'épingle (bas de l'icône) repose sur le centre de la carte.
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pin: { marginBottom: 44, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4 },
  cta: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19 },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 13.5 },
  attribution: { position: 'absolute', left: 8, bottom: 6, fontFamily: fonts.bodyMedium, fontSize: 10, color: 'rgba(0,0,0,0.6)', backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
});
