import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';
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
 * et visionneuse plein écran (transition depuis la vignette, zoom, partage).
 */
export function SessionGallery({ sections }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const visible = useMemo(() => sections.filter((s) => s.photos.length > 0), [sections]);
  const [tab, setTab] = useState(0);
  const [mode, setMode] = useState<Mode>('mosaic');
  const [autoplay, setAutoplay] = useState(true);
  const [focusIndex, setFocusIndex] = useState(0);
  const [viewer, setViewer] = useState<{ index: number; origin: PhotoOrigin } | null>(null);

  const section = visible[Math.min(tab, visible.length - 1)];
  if (!section) return null;

  const switchTab = (i: number) => {
    setTab(i);
    setFocusIndex(0);
    haptics.selection();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{t('member.galerie')}</Text>
          <Text style={styles.count}>{visible.reduce((n, s) => n + s.photos.length, 0)}</Text>
        </View>
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

      {visible.length > 1 ? (
        <View style={styles.tabs}>
          {visible.map((s, i) => {
            const on = i === Math.min(tab, visible.length - 1);
            return (
              <Pressable key={s.id} onPress={() => switchTab(i)} style={[styles.tab, on && styles.tabOn]} accessibilityState={{ selected: on }}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{s.label}</Text>
                <Text style={[styles.tabCount, on && styles.tabCountOn]}>{s.photos.length}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {mode === 'mosaic' ? (
        <GalleryMosaic key={section.id} photos={section.photos} onOpen={(index, origin) => setViewer({ index, origin })} />
      ) : (
        <GalleryCarousel
          key={section.id}
          photos={section.photos}
          onOpen={(index, origin) => setViewer({ index, origin })}
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
        onIndexChange={setFocusIndex}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
    count: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    title: { flexShrink: 1, fontFamily: fonts.head, fontSize: 19, letterSpacing: -0.4, color: colors.text },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexShrink: 1 },
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
