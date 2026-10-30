import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

interface Props {
  /** Page courante, à partir de 0. */
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/** Pages affichées : première, dernière, courante et ses voisines ; « … » pour les trous. */
function visiblePages(page: number, count: number): (number | 'gap-left' | 'gap-right')[] {
  if (count <= 5) return Array.from({ length: count }, (_, i) => i);
  const set = new Set([0, count - 1, page - 1, page, page + 1]);
  const pages = [...set].filter((p) => p >= 0 && p < count).sort((a, b) => a - b);
  const out: (number | 'gap-left' | 'gap-right')[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push(i === 1 ? 'gap-left' : 'gap-right');
    out.push(p);
  });
  return out;
}

/** Pagination : flèches, numéros de page avec page active en dégradé, et « 11–20 sur 47 » dessous. */
export function Pagination({ page, pageCount, pageSize, total, onChange }: Props) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (pageCount <= 1) return null;
  const first = page * pageSize + 1;
  const last = Math.min((page + 1) * pageSize, total);

  const Arrow = ({ dir, disabled, onPress }: { dir: 'prev' | 'next'; disabled: boolean; onPress: () => void }) => (
    <Pressable
      accessibilityLabel={dir === 'prev' ? i18n.t('common.page_precedente') : i18n.t('common.page_suivante')}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.arrow, disabled && { opacity: 0.3 }, pressed && { backgroundColor: colors.primarySoft }]}
    >
      <MaterialIcons name={dir === 'prev' ? 'chevron-left' : 'chevron-right'} size={24} color={colors.text} />
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.capsule, cardShadow]}>
        <Arrow dir="prev" disabled={page === 0} onPress={() => onChange(page - 1)} />
        <View style={styles.numbers}>
          {visiblePages(page, pageCount).map((p) =>
            typeof p === 'string' ? (
              <Text key={p} style={styles.gap}>…</Text>
            ) : p === page ? (
              <LinearGradient key={p} colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pageActive}>
                <Text style={styles.pageActiveText}>{p + 1}</Text>
              </LinearGradient>
            ) : (
              <Pressable key={p} onPress={() => onChange(p)} style={({ pressed }) => [styles.page, pressed && { backgroundColor: colors.primarySoft }]} accessibilityLabel={t('common.page', { v0: p + 1 })}>
                <Text style={styles.pageText}>{p + 1}</Text>
              </Pressable>
            ),
          )}
        </View>
        <Arrow dir="next" disabled={page >= pageCount - 1} onPress={() => onChange(page + 1)} />
      </View>
      <Text style={styles.summary}>
        <Text style={styles.summaryStrong}>{first}–{last}</Text>{t('common.pagination_rest', { total, page: page + 1, pageCount })}
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: 10, paddingTop: 8 },
    capsule: {
      flexDirection: 'row', alignItems: 'center', gap: 4, padding: 5, borderRadius: 999,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    numbers: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    page: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    pageText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    pageActive: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    pageActiveText: { fontFamily: fonts.head, fontSize: 16, color: colors.primaryContrast },
    gap: { width: 22, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 15, color: colors.muted },
    summary: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textAlign: 'center' },
    summaryStrong: { fontFamily: fonts.bodyBold, color: colors.text },
  });
}
