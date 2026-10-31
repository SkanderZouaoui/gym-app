import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { fonts, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';
import { blurhashRgba } from '../../utils/blurhash';
import { GalleryCarousel } from './GalleryCarousel';
import { GalleryMosaic } from './GalleryMosaic';
import { GalleryViewer } from './GalleryViewer';
import type { GallerySection, PhotoOrigin } from './photos';

interface Props {
  /** Une section par provenance des photos (le cours, la salle…) ; les sections vides sont ignorées. */
  sections: GallerySection[];
}

type Mode = 'mosaic' | 'carousel';

/**
 * Galerie du détail d'un cours : onglets Cours / Salle, bascule mosaïque ↔ carrousel (avec défilement automatique),
 * halo à la couleur dominante de la photo, et visionneuse plein écran (transition depuis la vignette, zoom, partage).
 */
export function SessionGallery({ sections }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const visible = useMemo(() => sections.filter((s) => s.photos.length > 0), [sections]);
  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState<Mode>('mosaic');
  const [autoplay, setAutoplay] = useState(true);
  const [active, setActive] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [viewer, setViewer] = useState<{ index: number; origin: PhotoOrigin } | null>(null);

  const section = visible[Math.min(tab, visible.length - 1)];
  const onActiveChange = useCallback((i: number) => setActive(i), []);
  if (!section) return null;

  const haloPhoto = mode === 'carousel' ? section.photos[Math.min(active, section.photos.length - 1)] : section.photos[0];
  const switchTab = (i: number) => {
    setTab(i);
    setActive(0);
    setFocusIndex(0);
    haptics.selection();
  };

  return (
    <View style={styles.wrap}>
      {/* Halo : la couleur dominante de la photo mise en avant, qui s'efface vers le fond de l'écran. */}
      <LinearGradient colors={[blurhashRgba(haloPhoto.blurhash, 0.28, 'transparent'), 'rgba(0,0,0,0)']} style={styles.halo} pointerEvents="none" />

      <View style={styles.header}>
        {visible.length > 1 ? (
          <View style={styles.tabs}>
            {visible.map((s, i) => {
              const on = i === Math.min(tab, visible.length - 1);
              return (
                <Pressable key={s.id} onPress={() => switchTab(i)} style={[styles.tab, on && styles.tabOn]} accessibilityState={{ selected: on }}>
                  <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{s.label}</Text>
                  <Text style={[styles.tabCount, on && styles.tabCountOn]}>{s.photos.length}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.tabs}>
            <Text style={styles.title} numberOfLines={1}>{section.label}</Text>
            <Text style={[styles.tabCount, styles.tabCountOn]}>{section.photos.length}</Text>
          </View>
        )}
        <View style={styles.tools}>
          {mode === 'carousel' && section.photos.length > 1 ? (
            <Pressable
              style={[styles.tool, autoplay && styles.toolOn]}
              onPress={() => setAutoplay((a) => !a)}
              accessibilityLabel={autoplay ? t('member.galerie_pause') : t('member.galerie_lecture_auto')}
              hitSlop={6}
            >
              <MaterialIcons name={autoplay ? 'pause' : 'play-arrow'} size={20} color={autoplay ? colors.primaryContrast : colors.primaryInk} />
            </Pressable>
          ) : null}
          <Pressable
            style={styles.tool}
            onPress={() => setMode((m) => (m === 'mosaic' ? 'carousel' : 'mosaic'))}
            accessibilityLabel={mode === 'mosaic' ? t('member.galerie_carrousel') : t('member.galerie_mosaique')}
            hitSlop={6}
          >
            <MaterialIcons name={mode === 'mosaic' ? 'view-carousel' : 'grid-view'} size={20} color={colors.primaryInk} />
          </Pressable>
        </View>
      </View>

      {mode === 'mosaic' ? (
        <GalleryMosaic key={section.id} photos={section.photos} onOpen={(index, origin) => setViewer({ index, origin })} />
      ) : (
        <GalleryCarousel
          key={section.id}
          photos={section.photos}
          onOpen={(index, origin) => setViewer({ index, origin })}
          onActiveChange={onActiveChange}
          focusIndex={focusIndex}
          autoplay={autoplay}
          paused={viewer !== null}
        />
      )}

      <GalleryViewer
        visible={viewer !== null}
        photos={section.photos}
        startIndex={viewer?.index ?? 0}
        origin={viewer?.origin ?? null}
        onIndexChange={(i) => {
          setActive(i);
          setFocusIndex(i);
        }}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    halo: { position: 'absolute', top: -16, left: -spacing.lg, right: -spacing.lg, height: 260, opacity: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    tabs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
    title: { flexShrink: 1, fontFamily: fonts.head, fontSize: 19, letterSpacing: -0.4, color: colors.text },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexShrink: 1 },
    tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { flexShrink: 1, fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.text },
    tabTextOn: { color: colors.primaryContrast },
    tabCount: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.muted },
    tabCountOn: { color: colors.primaryInk, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9, overflow: 'hidden' },
    tools: { flexDirection: 'row', gap: 8 },
    tool: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    toolOn: { backgroundColor: colors.primary },
  });
}
