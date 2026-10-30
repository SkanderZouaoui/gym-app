import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const TRACK = 56;

/**
 * Liste horizontale (filtres, onglets) avec un indice de défilement placé SOUS la liste :
 * une fine barre dont le curseur montre la position et la part visible du contenu.
 * Rien ne recouvre les éléments ; la barre n'apparaît que s'il y a du contenu caché.
 */
export function HScroll({ children, contentContainerStyle, onScroll, ...rest }: ScrollViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  const [x, setX] = useState(0);
  const overflow = content > box + 4 && box > 0;
  const thumb = overflow ? Math.max(18, Math.round((box / content) * TRACK)) : 0;
  const progress = overflow ? Math.min(1, Math.max(0, x / (content - box))) : 0;

  return (
    <View onLayout={(e) => setBox(e.nativeEvent.layout.width)}>
      <ScrollView
        {...rest}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        scrollEventThrottle={16}
        onContentSizeChange={(w) => setContent(w)}
        onScroll={(e) => {
          setX(e.nativeEvent.contentOffset.x);
          onScroll?.(e);
        }}
      >
        {children}
      </ScrollView>
      {overflow ? (
        <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.thumb, { width: thumb, left: progress * (TRACK - thumb) }]} />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    track: { alignSelf: 'center', width: TRACK, height: 4, borderRadius: 2, marginTop: 8, backgroundColor: colors.surface2 },
    thumb: { position: 'absolute', top: 0, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  });
}
