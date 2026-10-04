import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMe } from '../../src/hooks/useMe';
import { useAdminDashboard } from '../../src/hooks/useAdmin';

export default function AdminDashboardScreen() {
  const { data: user } = useMe();
  const { data } = useAdminDashboard(user?.homeBranchId ?? undefined);

  const kpis = [
    { label: 'Adhérents actifs', value: data?.activeMembers ?? 0, icon: 'people' as const, tone: 'primary' },
    { label: 'Présences du jour', value: data?.attendanceToday ?? 0, icon: 'event-available' as const, tone: 'success' },
    { label: 'Remplissage moyen', value: `${data?.avgFillRate ?? 0}%`, icon: 'bar-chart' as const, tone: 'accent' },
    { label: 'Revenus du jour', value: `${data?.revenueToday ?? 0} DT`, icon: 'payments' as const, tone: 'info' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Bonjour {user?.firstName}</Text>
        <Text style={styles.subtitle}>Vue d'ensemble du site</Text>

        <View style={styles.grid}>
          {kpis.map((k) => (
            <View key={k.label} style={styles.kpiCard}>
              <MaterialIcons name={k.icon} size={20} color={colors.primaryInk} />
              <Text style={styles.kpiValue}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {data?.alerts ? (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Alertes</Text>
            {data.alerts.expiringMemberships > 0 ? (
              <Text style={styles.alertLine}>
                {data.alerts.expiringMemberships} abonnement(s) expirent bientôt
              </Text>
            ) : null}
            {data.alerts.underfilledClasses > 0 ? (
              <Text style={styles.alertLine}>{data.alerts.underfilledClasses} cours sous-remplis</Text>
            ) : null}
            {data.alerts.expiringMemberships === 0 && data.alerts.underfilledClasses === 0 ? (
              <Text style={styles.alertLine}>Aucune alerte</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpiCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: 6,
  },
  kpiValue: { fontFamily: fonts.head, fontSize: 22, color: colors.text },
  kpiLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
  alertCard: {
    backgroundColor: colors.warningSoft, borderRadius: radii.md, borderWidth: 1, borderColor: colors.warning,
    padding: spacing.md, gap: 6,
  },
  alertTitle: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.warningInk },
  alertLine: { fontFamily: fonts.body, fontSize: 13, color: colors.warningInk },
});
