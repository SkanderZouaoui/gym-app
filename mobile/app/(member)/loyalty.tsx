import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Button } from '../../src/components/Button';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMyPoints } from '../../src/hooks/useMe';
import {
  useActiveChallenges,
  useJoinChallenge,
  usePointsHistory,
  useReferralCode,
  useStreak,
} from '../../src/hooks/useLoyalty';

const REASON_LABELS: Record<string, string> = {
  CLASS_ATTENDED: 'Présence à un cours',
  NO_SHOW_PENALTY: 'Absence non signalée',
  CHALLENGE_COMPLETED: 'Défi complété',
  REFERRAL_COMPLETED: 'Parrainage réussi',
};

export default function LoyaltyScreen() {
  const { data: points } = useMyPoints();
  const { data: streak } = useStreak();
  const { data: history } = usePointsHistory();
  const { data: challenges } = useActiveChallenges();
  const joinChallenge = useJoinChallenge();
  const referralCode = useReferralCode();
  const [code, setCode] = useState<string | null>(null);

  const handleShareReferral = () => {
    referralCode.mutate(undefined, {
      onSuccess: (res) => {
        setCode(res.code);
        Share.share({ message: `Rejoins-moi sur MuscleUP avec mon code de parrainage : ${res.code}` });
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Fidélité" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroValue}>{points?.points ?? 0}</Text>
            <Text style={styles.heroLabel}>points</Text>
          </View>
          <View style={styles.streakBox}>
            <MaterialIcons name="local-fire-department" size={28} color={colors.accentInk} />
            <Text style={styles.streakValue}>{streak?.streak ?? 0}</Text>
            <Text style={styles.streakLabel}>jours de suite</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Défis en cours</Text>
        {challenges?.length ? (
          challenges.map((c) => (
            <View key={c.id} style={styles.card}>
              <Text style={styles.challengeName}>{c.name}</Text>
              {c.description ? <Text style={styles.challengeDesc}>{c.description}</Text> : null}
              <View style={styles.challengeFooter}>
                <Text style={styles.challengeReward}>+{c.pointsReward} points</Text>
                <Pressable onPress={() => joinChallenge.mutate(c.id)} style={styles.joinButton}>
                  <Text style={styles.joinButtonText}>Rejoindre</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Aucun défi actif pour le moment.</Text>
        )}

        <Text style={styles.sectionTitle}>Parrainage</Text>
        <View style={styles.card}>
          <Text style={styles.challengeDesc}>
            Invite un ami et gagnez des points lorsqu'il rejoint MuscleUP.
          </Text>
          {code ? <Text style={styles.referralCode}>{code}</Text> : null}
          <Button label="Partager mon code" onPress={handleShareReferral} variant="secondary" />
        </View>

        <Text style={styles.sectionTitle}>Historique</Text>
        {history?.length ? (
          history.slice(0, 10).map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <Text style={styles.historyReason}>{REASON_LABELS[h.reason] ?? h.reason}</Text>
              <Text style={[styles.historyPoints, h.points < 0 && styles.historyPointsNegative]}>
                {h.points > 0 ? '+' : ''}
                {h.points}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Aucun mouvement de points.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  heroCard: {
    flexDirection: 'row', backgroundColor: colors.secondary, borderRadius: radii.lg,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm,
  },
  heroValue: { fontFamily: fonts.head, fontSize: 36, color: colors.onSecondary },
  heroLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.onSecondary, opacity: 0.8 },
  streakBox: { alignItems: 'center', gap: 2 },
  streakValue: { fontFamily: fonts.headBold, fontSize: 18, color: colors.onSecondary },
  streakLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.onSecondary, opacity: 0.8 },
  sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 8,
  },
  challengeName: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
  challengeDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  challengeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  challengeReward: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentInk },
  joinButton: { backgroundColor: colors.primarySoft, borderRadius: radii.xs, paddingHorizontal: 12, paddingVertical: 7 },
  joinButtonText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
  referralCode: { fontFamily: fonts.headBold, fontSize: 18, color: colors.primaryInk, letterSpacing: 1 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  historyReason: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  historyPoints: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.successInk },
  historyPointsNegative: { color: colors.dangerInk },
  empty: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
});
