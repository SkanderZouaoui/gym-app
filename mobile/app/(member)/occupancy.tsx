import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMe } from '../../src/hooks/useMe';
import { useBranchOccupancy } from '../../src/hooks/useOccupancy';
import { BarHistogram, ProgressBar } from '../../src/components/ui';

function levelTone(percent: number | null, colors: ReturnType<typeof useTheme>['colors']) {
  if (percent === null) return { label: '—', color: colors.muted, bg: colors.surface2 };
  if (percent >= 75) return { label: 'Forte', color: colors.dangerInk, bg: colors.danger };
  if (percent >= 40) return { label: 'Modérée', color: colors.warningInk, bg: colors.warning };
  return { label: 'Calme', color: colors.successInk, bg: colors.success };
}

/** Affluence en direct — FitZone App Entraînement.dc.html, H1.
 * Estimation dérivée des pointages d’entrée des 2 dernières heures (pas de
 * capteurs de sortie en temps réel — voir note dans branches.service.ts). */
export default function OccupancyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const { data: occupancy, isLoading } = useBranchOccupancy(user?.homeBranchId ?? undefined);

  if (isLoading || !occupancy) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const tone = levelTone(occupancy.percent, colors);
  const currentHour = new Date().getHours();
  const bestHourIndex = occupancy.hourly
    .map((v, i) => ({ v, i }))
    .filter(({ i }) => i >= 6 && i <= 22)
    .sort((a, b) => a.v - b.v)[0]?.i;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Affluence" fallbackHref="/(member)" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>En direct</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.branchName}>{occupancy.branchName}</Text>
          <Text style={[styles.percentValue, { color: tone.color }]}>{occupancy.percent ?? '—'}%</Text>
          <Text style={styles.summarySub}>
            {tone.label} · {occupancy.currentCount} personnes{occupancy.capacity ? `, cap. ${occupancy.capacity}` : ''}
          </Text>
          {occupancy.percent !== null ? <ProgressBar progress={occupancy.percent / 100} color={tone.bg} /> : null}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{occupancy.branchName} · aujourd’hui</Text>
          <BarHistogram values={occupancy.hourly.slice(6, 23)} highlightIndex={currentHour - 6} height={70} />
          <View style={styles.axisRow}>
            <Text style={styles.axisLabel}>6h</Text>
            <Text style={styles.axisLabel}>12h</Text>
            <Text style={styles.axisLabel}>18h</Text>
            <Text style={styles.axisLabel}>22h</Text>
          </View>
        </View>

        {bestHourIndex !== undefined ? (
          <View style={styles.bestTimeCard}>
            <Text style={styles.bestTimeLabel}>MEILLEUR MOMENT AUJOURD’HUI</Text>
            <Text style={styles.bestTimeValue}>{bestHourIndex}:00 – {bestHourIndex + 1}:00</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 60 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  liveText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.dangerInk },
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 6,
  },
  branchName: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
  percentValue: { fontFamily: fonts.head, fontSize: 36 },
  summarySub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  chartCard: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  chartTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted },
  bestTimeCard: { backgroundColor: colors.successSoft, borderRadius: radii.md, padding: spacing.md, gap: 2 },
  bestTimeLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, letterSpacing: 0.4, color: colors.successInk },
  bestTimeValue: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.successInk },
  });
}
