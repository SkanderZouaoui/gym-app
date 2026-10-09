import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface BadgeTileProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  unlocked: boolean;
  progressLabel: string;
}

/** Tuile de badge de la grille Fidélité — FitZone App Compte.dc.html, I1. */
export function BadgeTile({ icon, label, unlocked, progressLabel }: BadgeTileProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.tile}>
      <View style={[styles.circle, unlocked ? styles.unlocked : styles.locked]}>
        <MaterialIcons name={icon} size={26} color={unlocked ? colors.accentInk : colors.borderStrong} />
        {!unlocked ? (
          <View style={styles.lockBadge}>
            <MaterialIcons name="lock" size={11} color={colors.muted} />
          </View>
        ) : null}
      </View>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      <Text style={styles.progress}>{progressLabel}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    tile: { width: '23%', alignItems: 'center', gap: 4 },
    circle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    unlocked: { backgroundColor: colors.accentSoft, borderWidth: 2, borderColor: colors.accentBorder },
    locked: { backgroundColor: colors.surface2, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
    lockBadge: {
      position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.text, textAlign: 'center' },
    progress: { fontFamily: fonts.body, fontSize: 9.5, color: colors.muted },
  });
}
