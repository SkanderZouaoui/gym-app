import { useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ScrollView, Share, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Button } from '../../src/components/Button';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useReferralCode, useReferralOverview } from '../../src/hooks/useLoyalty';
import { EmptyState, Pill, SkeletonBlock } from '../../src/components/ui';

export default function ReferralScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: overview, isLoading } = useReferralOverview();
  const requestCode = useReferralCode();
  const [copied, setCopied] = useState(false);

  const code = overview?.code ?? null;

  const handleShare = async () => {
    const activeCode = code ?? (await requestCode.mutateAsync()).code;
    Share.share({ message: `Rejoins-moi sur MuscleUP avec mon code de parrainage : ${activeCode}` });
  };

  const handleCopy = async () => {
    const activeCode = code ?? (await requestCode.mutateAsync()).code;
    await Clipboard.setStringAsync(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Parrainage" fallbackHref="/(member)/loyalty" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Invitez un ami : gagnez des points</Text>
          <Text style={styles.heroDesc}>
            Les points sont crédités dès son premier règlement à l’accueil.
          </Text>

          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{code ?? '— — — — —'}</Text>
            <Pressable onPress={handleCopy} style={styles.copyButton} hitSlop={8}>
              <MaterialIcons name={copied ? 'check' : 'content-copy'} size={18} color={colors.accentInk} />
              <Text style={styles.copyButtonText}>{copied ? 'Copié' : 'Copier'}</Text>
            </Pressable>
          </View>

          <Button label="Partager mon code" onPress={handleShare} variant="primary" />
        </View>

        {overview?.limitReached ? (
          <View style={styles.limitBanner}>
            <MaterialIcons name="block" size={22} color={colors.dangerInk} />
            <View style={{ flex: 1 }}>
              <Text style={styles.limitTitle}>
                Limite atteinte : {overview.maxReferralsPerYear} filleuls cette année
              </Text>
              <Text style={styles.limitDesc}>
                Votre code est temporairement suspendu. Vos points déjà gagnés restent acquis.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <Stat value={String(overview?.invitedCount ?? 0)} label="filleuls" />
          <Stat value={String(overview?.pointsEarned ?? 0)} label="points gagnés" />
        </View>

        <Text style={styles.sectionTitle}>Mes filleuls</Text>

        {isLoading ? (
          <View style={{ gap: spacing.sm }}>
            <SkeletonBlock height={56} />
            <SkeletonBlock height={56} />
          </View>
        ) : overview?.referrals.length ? (
          <View style={styles.list}>
            {overview.referrals.map((r) => (
              <View key={r.id} style={styles.referralRow}>
                <View style={styles.referralAvatar}>
                  <Text style={styles.referralInitials}>
                    {r.referee.firstName[0]}
                    {r.referee.lastName[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.referralName}>
                    {r.referee.firstName} {r.referee.lastName}
                  </Text>
                  <Text style={styles.referralDate}>
                    Inscrit le {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <Pill label={`+${r.rewardPoints ?? 0}`} tone="success" />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="group-add"
            title="Aucun filleul pour l’instant"
            text="Partagez votre code : vos invitations apparaîtront ici."
            tone="muted"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: 120 },
    hero: {
      backgroundColor: colors.accentSoft, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.accentBorder,
      padding: spacing.lg, gap: spacing.sm,
    },
    heroTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.accentInk },
    heroDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.accentInk },
    codeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingLeft: spacing.md,
      paddingRight: 6, borderRadius: radii.sm, backgroundColor: colors.surface,
      borderWidth: 1.5, borderColor: colors.accentBorder, borderStyle: 'dashed',
    },
    codeText: { flex: 1, fontFamily: fonts.headBold, fontSize: 18, letterSpacing: 1, color: colors.text },
    copyButton: {
      flexDirection: 'row', alignItems: 'center', gap: 4, height: 40, paddingHorizontal: 12,
      borderRadius: radii.xs, backgroundColor: colors.surface2,
    },
    copyButtonText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.accentInk },
    limitBanner: {
      flexDirection: 'row', gap: 10, padding: spacing.md, borderRadius: radii.md,
      backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.dangerSoft,
    },
    limitTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.dangerInk },
    limitDesc: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dangerInk },
    statsRow: { flexDirection: 'row', gap: spacing.sm },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
      padding: spacing.sm, gap: 2,
    },
    statValue: { fontFamily: fonts.head, fontSize: 20, color: colors.text },
    statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    list: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden',
    },
    referralRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    referralAvatar: {
      width: 40, height: 40, borderRadius: 999, backgroundColor: colors.secondarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    referralInitials: { fontFamily: fonts.headBold, fontSize: 13, color: colors.secondaryInk },
    referralName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    referralDate: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  });
}
