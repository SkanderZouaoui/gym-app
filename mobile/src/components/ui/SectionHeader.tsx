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
  style?: StyleProp<ViewStyle>;
}

/** Titre de section : pastille colorée avec pictogramme, titre en gras, lien d'action discret à droite. */
export function SectionHeader({ title, icon, actionLabel, onAction, style }: SectionHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.row, style]}>
      {icon ? (
        <View style={styles.icon}>
          <MaterialIcons name={icon} size={16} color={colors.primaryInk} />
        </View>
      ) : null}
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action} accessibilityRole="link">
          <Text style={styles.actionText}>{actionLabel}</Text>
          <MaterialIcons name="chevron-right" size={18} color={colors.primaryInk} />
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    icon: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    title: { flex: 1, minWidth: 0, fontFamily: fonts.head, fontSize: 19, letterSpacing: -0.5, color: colors.text },
    action: { flexDirection: 'row', alignItems: 'center', gap: 1 },
    actionText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
  });
}
