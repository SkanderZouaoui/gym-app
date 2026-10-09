import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { ProgressBar } from '../ui';

interface ChallengeCardProps {
  name: string;
  description?: string | null;
  pointsReward: number;
  endDate: string;
  progress?: number;
  progressLabel?: string;
  joined: boolean;
  onJoin?: () => void;
}

/** Carte de défi — FitZone App Compte.dc.html, I2. */
export function ChallengeCard({ name, description, pointsReward, endDate, progress, progressLabel, joined, onJoin }: ChallengeCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialIcons name="emoji-events" size={22} color={colors.accentInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            +{pointsReward} pts · fin {new Date(endDate).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        {!joined ? (
          <Pressable onPress={onJoin} style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Rejoindre</Text>
          </Pressable>
        ) : null}
      </View>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {joined && progress !== undefined ? (
        <View style={styles.progressRow}>
          <ProgressBar progress={progress} color={colors.accent} />
          {progressLabel ? <Text style={styles.progressLabel}>{progressLabel}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 10,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    name: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    desc: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    joinButton: { height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    joinButtonText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.primaryInk },
    progressRow: { gap: 6, flexDirection: 'row', alignItems: 'center' },
    progressLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accentInk, width: 36, textAlign: 'right' },
  });
}
