import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMyPoints } from '../../src/hooks/useMe';
import {
  useActiveChallenges,
  useBadges,
  useChallengeLeaderboard,
  useJoinChallenge,
  usePointsHistory,
  useStreak,
} from '../../src/hooks/useLoyalty';
import { EmptyState, Pill, SegmentedControl } from '../../src/components/ui';
import { ChallengeCard } from '../../src/components/adherent/ChallengeCard';
import { BadgeTile } from '../../src/components/adherent/BadgeTile';

const BADGE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  streak_7: 'local-fire-department',
  streak_30: 'whatshot',
  streak_90: 'military-tech',
};
const DEFAULT_BADGE_ICON = 'military-tech';

function resolveBadgeIcon(iconKey: string | null): keyof typeof MaterialIcons.glyphMap {
  if (iconKey && iconKey in BADGE_ICONS) return BADGE_ICONS[iconKey];
  return DEFAULT_BADGE_ICON;
}

const REASON_LABELS: Record<string, string> = {
  CLASS_ATTENDED: 'Présence à un cours',
  NO_SHOW_PENALTY: 'Absence non signalée',
  CHALLENGE_COMPLETED: 'Défi complété',
  REFERRAL_COMPLETED: 'Parrainage réussi',
};

const PODIUM_TONES = ['accent', 'secondary', 'warning'] as const;

export default function LoyaltyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: points } = useMyPoints();
  const { data: streak } = useStreak();
  const { data: history } = usePointsHistory();
  const { data: challenges } = useActiveChallenges();
  const { data: badges } = useBadges();
  const joinChallenge = useJoinChallenge();
  const [tab, setTab] = useState<'points' | 'challenges' | 'ranking'>('points');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | undefined>(undefined);

  const activeChallengeId = selectedChallengeId ?? challenges?.[0]?.id;
  const { data: leaderboard } = useChallengeLeaderboard(tab === 'ranking' ? activeChallengeId : undefined);

  const podium = leaderboard?.slice(0, 3) ?? [];
  const rest = leaderboard?.slice(3) ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Fidélité" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabelTop}>MON SOLDE</Text>
            <Text style={styles.heroValue}>{points?.points ?? 0}</Text>
            <Text style={styles.heroLabel}>points</Text>
          </View>
          <View style={styles.streakBox}>
            <MaterialIcons name="local-fire-department" size={28} color={colors.accentInk} />
            <Text style={styles.streakValue}>{streak?.streak ?? 0}</Text>
            <Text style={styles.streakLabel}>semaines de suite</Text>
          </View>
        </View>

        {badges?.length ? (
          <View style={{ gap: spacing.sm }}>
            <View style={styles.badgesHeader}>
              <Text style={styles.sectionTitle}>Badges</Text>
              <Text style={styles.badgesCount}>
                {badges.filter((b) => b.earned).length} sur {badges.length}
              </Text>
            </View>
            <View style={styles.badgesGrid}>
              {badges.map((b) => (
                <BadgeTile
                  key={b.id}
                  icon={resolveBadgeIcon(b.iconKey)}
                  label={b.name}
                  unlocked={b.earned}
                  progressLabel={b.earned ? 'Débloqué' : b.criterionValue ? `${b.criterionValue} j.` : ''}
                />
              ))}
            </View>
          </View>
        ) : null}

        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'points', label: 'Historique' },
            { value: 'challenges', label: 'Défis' },
            { value: 'ranking', label: 'Classement' },
          ]}
        />

        {tab === 'challenges' ? (
          <View style={{ gap: spacing.sm }}>
            {challenges?.length ? (
              challenges.map((c) => (
                <ChallengeCard
                  key={c.id}
                  name={c.name}
                  description={c.description}
                  pointsReward={c.pointsReward}
                  endDate={c.endDate}
                  joined={false}
                  onJoin={() => joinChallenge.mutate(c.id)}
                />
              ))
            ) : (
              <EmptyState
                icon="flag"
                title="Aucun défi en cours"
                text="Les prochains défis de la salle apparaîtront ici."
                tone="warning"
              />
            )}

            <Pressable
              onPress={() => router.navigate('/(member)/referral')}
              style={styles.referralLink}
            >
              <View style={styles.referralLinkIcon}>
                <MaterialIcons name="group-add" size={22} color={colors.accentInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.referralLinkTitle}>Invitez un ami</Text>
                <Text style={styles.referralLinkDesc}>Gagnez des points à chaque filleul</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          </View>
        ) : tab === 'ranking' ? (
          <View style={{ gap: spacing.sm }}>
            {challenges?.length ? (
              <View style={styles.challengePicker}>
                {challenges.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedChallengeId(c.id)}
                    style={[styles.challengeChip, activeChallengeId === c.id && styles.challengeChipActive]}
                  >
                    <Text
                      style={[styles.challengeChipText, activeChallengeId === c.id && styles.challengeChipTextActive]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {!activeChallengeId ? (
              <EmptyState
                icon="leaderboard"
                title="Aucun classement disponible"
                text="Rejoignez un défi pour voir le classement des participants."
                tone="muted"
              />
            ) : leaderboard?.length ? (
              <>
                <View style={styles.podiumRow}>
                  {podium.map((p, i) => (
                    <View key={p.id} style={styles.podiumItem}>
                      <View style={[styles.podiumAvatar, { borderColor: colors[PODIUM_TONES[i]] }]}>
                        <Text style={styles.podiumInitials}>
                          {p.user.firstName[0]}
                          {p.user.lastName[0]}
                        </Text>
                      </View>
                      <Text style={styles.podiumName} numberOfLines={1}>{p.user.firstName}</Text>
                      <View
                        style={[
                          styles.podiumBar,
                          { height: 56 - i * 14, backgroundColor: colors[PODIUM_TONES[i]] },
                        ]}
                      >
                        <Text style={styles.podiumRank}>{i + 1}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {rest.length > 0 ? (
                  <View style={styles.rankList}>
                    {rest.map((p, i) => (
                      <View key={p.id} style={styles.rankRow}>
                        <Text style={styles.rankNumber}>{i + 4}</Text>
                        <Text style={styles.rankName} numberOfLines={1}>
                          {p.user.firstName} {p.user.lastName}
                        </Text>
                        <Text style={styles.rankProgress}>{p.progress}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon="leaderboard"
                title="Aucun participant"
                text="Soyez le premier à rejoindre ce défi."
                tone="muted"
              />
            )}
          </View>
        ) : (
          <View style={{ gap: 2 }}>
            {history?.length ? (
              history.slice(0, 20).map((h) => (
                <View key={h.id} style={styles.historyRow}>
                  <Text style={styles.historyReason}>{REASON_LABELS[h.reason] ?? h.reason}</Text>
                  <Pill label={`${h.points > 0 ? '+' : ''}${h.points}`} tone={h.points < 0 ? 'danger' : 'success'} />
                </View>
              ))
            ) : (
              <EmptyState icon="receipt-long" title="Aucun mouvement" text="Vos gains de points apparaîtront ici." tone="muted" />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: 120 },
    heroCard: {
      flexDirection: 'row', backgroundColor: colors.secondary, borderRadius: radii.lg,
      padding: spacing.lg, alignItems: 'center',
    },
    heroLabelTop: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.5, color: colors.onSecondary, opacity: 0.8 },
    heroValue: { fontFamily: fonts.head, fontSize: 36, color: colors.onSecondary },
    heroLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.onSecondary, opacity: 0.8 },
    streakBox: { alignItems: 'center', gap: 2 },
    streakValue: { fontFamily: fonts.headBold, fontSize: 18, color: colors.onSecondary },
    streakLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.onSecondary, opacity: 0.8 },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
    badgesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    badgesCount: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
    referralLink: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.accentSoft,
      borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm,
    },
    referralLinkIcon: {
      width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    referralLinkTitle: { fontFamily: fonts.headSemiBold, fontSize: 14.5, color: colors.accentInk },
    referralLinkDesc: { fontFamily: fonts.body, fontSize: 12.5, color: colors.accentInk },
    challengePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    challengeChip: {
      height: 34, paddingHorizontal: 12, borderRadius: 999, maxWidth: 180,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    challengeChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
    challengeChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
    challengeChipTextActive: { color: colors.onSecondary },
    podiumRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: spacing.sm },
    podiumItem: { flex: 1, alignItems: 'center', gap: 6 },
    podiumAvatar: {
      width: 52, height: 52, borderRadius: 999, backgroundColor: colors.secondarySoft,
      borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    },
    podiumInitials: { fontFamily: fonts.headBold, fontSize: 15, color: colors.secondaryInk },
    podiumName: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text, maxWidth: '100%' },
    podiumBar: {
      width: '100%', borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center',
    },
    podiumRank: { fontFamily: fonts.headBold, fontSize: 18, color: colors.onSecondary },
    rankList: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden', marginTop: spacing.sm,
    },
    rankRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md,
      height: 48, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    rankNumber: { fontFamily: fonts.headBold, fontSize: 14, color: colors.muted, width: 20 },
    rankName: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    rankProgress: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.text },
    historyRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    historyReason: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  });
}
