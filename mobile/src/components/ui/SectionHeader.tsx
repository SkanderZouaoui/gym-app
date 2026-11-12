import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface SectionHeaderProps {
  title: string;
  /** Pictogramme dans la pastille à gauche du titre. */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Lien à droite (« Voir le planning »…), avec chevron. */
  actionLabel?: string;
  onAction?: () => void;
  /** Texte discret à droite quand il n'y a pas d'action (ex. « 12 séances »). */
  meta?: string;
  style?: StyleProp<ViewStyle>;
}

/** Titre de section : repère violet, libellé en capitales espacées, filet discret, lien d'action à droite. */
export function SectionHeader({ title, actionLabel, onAction, meta, style }: SectionHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.row, style]}>
      <View style={styles.mark} />
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      <View style={styles.rule} />
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action} accessibilityRole="link">
          <Text style={styles.actionText}>{actionLabel}</Text>
          <MaterialIcons name="arrow-forward" size={14} color={colors.primaryInk} />
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mark: { width: 4, height: 16, borderRadius: 2, backgroundColor: colors.primary },
    title: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.text },
    rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, minWidth: 12 },
    meta: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted },
    action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionText: { fontFamily: fonts.bodyBold, fontSize: 12.5, letterSpacing: 0.2, color: colors.primaryInk },
  });
}
