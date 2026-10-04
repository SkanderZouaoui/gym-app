import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMe, useMyBookings, useMyMemberships, useMyPoints } from '../../src/hooks/useMe';

export default function HomeScreen() {
  const { data: user } = useMe();
  const { data: memberships } = useMyMemberships();
  const { data: bookings } = useMyBookings();
  const { data: points } = useMyPoints();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const activeMembership = memberships?.find((m) => m.status === 'ACTIVE');
  const nextBooking = bookings
    ?.filter((b) => b.status === 'CONFIRMED' && b.session)
    .sort((a, b) => new Date(a.session!.startsAt).getTime() - new Date(b.session!.startsAt).getTime())[0];

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>MU</Text>
            </View>
            <Text style={styles.brand}>MuscleUP</Text>
          </View>
          <Pressable style={styles.bellButton}>
            <MaterialIcons name="notifications" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.sm }}>
          <Text style={styles.hello}>Bonjour {user?.firstName} 👋</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.pill,
                { backgroundColor: activeMembership ? colors.successSoft : colors.warningSoft },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: activeMembership ? colors.successInk : colors.warningInk },
                ]}
              >
                {activeMembership ? 'Actif' : 'Sans abonnement'}
              </Text>
            </View>
            {activeMembership ? (
              <Text style={styles.statusSub}>{activeMembership.plan.name}</Text>
            ) : null}
          </View>
        </View>

        <Pressable style={styles.qrCard} onPress={() => router.push('/(member)/qr')}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.qrTitle}>Présenter mon QR</Text>
            <Text style={styles.qrSubtitle}>Validez votre présence au cours</Text>
          </View>
          <View style={styles.qrIconBox}>
            <MaterialIcons name="qr-code-2" size={48} color={colors.primaryContrast} />
          </View>
        </Pressable>

        {nextBooking?.session ? (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>PROCHAIN COURS</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.classIcon}>
                <MaterialIcons name="local-fire-department" size={26} color={colors.primaryInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.className}>{nextBooking.session.classType.name}</Text>
                <Text style={styles.classMeta}>
                  {new Date(nextBooking.session.startsAt).toLocaleString('fr-FR', {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>AUCUN COURS À VENIR</Text>
            <Pressable onPress={() => router.push('/(member)/planning')} style={{ marginTop: 8 }}>
              <Text style={styles.linkText}>Voir le planning →</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.statsRow} onPress={() => router.push('/(member)/loyalty')}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{points?.points ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {bookings?.filter((b) => b.status === 'ATTENDED').length ?? 0}
            </Text>
            <Text style={styles.statLabel}>Séances suivies</Text>
          </View>
        </Pressable>

        <View style={styles.quickLinksGrid}>
          <QuickLink icon="emoji-events" label="Fidélité" onPress={() => router.push('/(member)/loyalty')} />
          <QuickLink icon="sports" label="Coaching" onPress={() => router.push('/(member)/coaching')} />
          <QuickLink icon="forum" label="Communauté" onPress={() => router.push('/(member)/community')} />
          <QuickLink icon="storefront" label="Boutique" onPress={() => router.push('/(member)/shop')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickLink} onPress={onPress}>
      <View style={styles.quickLinkIcon}>
        <MaterialIcons name={icon} size={22} color={colors.primaryInk} />
      </View>
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    width: 34, height: 34, borderRadius: radii.sm, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontFamily: fonts.head, color: colors.primaryContrast, fontSize: 12 },
  brand: { fontFamily: fonts.head, fontSize: 19, color: colors.secondary },
  bellButton: {
    width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  hello: { fontFamily: fonts.head, fontSize: 26, color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  statusSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  qrCard: {
    backgroundColor: colors.secondary, borderRadius: radii.lg, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  qrTitle: { fontFamily: fonts.headSemiBold, color: colors.onSecondary, fontSize: 18 },
  qrSubtitle: { fontFamily: fonts.body, color: colors.onSecondary, fontSize: 13, opacity: 0.85 },
  qrIconBox: {
    width: 76, height: 76, borderRadius: radii.md, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 10,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.5, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  classIcon: {
    width: 48, height: 48, borderRadius: radii.sm, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  className: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
  classMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  linkText: { fontFamily: fonts.bodyBold, color: colors.primaryInk, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: 4,
  },
  statValue: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  quickLinksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickLink: {
    width: '47%', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, alignItems: 'center', gap: 8,
  },
  quickLinkIcon: {
    width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLinkLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
});
