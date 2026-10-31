import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ImageGalleryProps {
  urls: string[];
}

const TILE_HEIGHT = 150;

/** Galerie de photos d'un cours : miniatures défilantes, puis visionneuse plein écran
 * (balayage horizontal entre les photos, compteur, bouton de fermeture). */
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
  const listRef = useRef<FlatList<string>>(null);

  if (urls.length === 0) return null;

  const open = (index: number) => {
    setCurrent(index);
    setOpenIndex(index);
  };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {urls.map((url, i) => (
          <Pressable
            key={url}
            onPress={() => open(i)}
            style={({ pressed }) => [styles.tile, cardShadow, pressed && { transform: [{ scale: 0.97 }] }]}
            accessibilityLabel={t('member.photo_sur', { v0: i + 1, length: urls.length })}
          >
            <Image source={{ uri: url }} style={styles.tileImage} contentFit="cover" transition={200} />
          </Pressable>
        ))}
      </ScrollView>

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
                  <Image source={{ uri: item }} style={{ width, height: height * 0.7 }} contentFit="contain" />
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
    row: { gap: 10, paddingVertical: 4 },
    tile: {
      width: 220, height: TILE_HEIGHT, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surface2,
      borderWidth: 1, borderColor: colors.border,
    },
    tileImage: { width: '100%', height: '100%' },
    viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
    viewerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
    counter: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    counterText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
    close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  });
}
