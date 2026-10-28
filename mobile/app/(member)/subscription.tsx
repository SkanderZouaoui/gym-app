import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMyMemberships } from '../../src/hooks/useMe';
import { usePlans, type MembershipPlan } from '../../src/hooks/usePlans';
import { EmptyState, ScreenTitle } from '../../src/components/ui';
import { MembershipHeroCard } from '../../src/components/adherent/MembershipHeroCard';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';

function durationLabel(days: number): string {
  if (days >= 360) return `${Math.round(days / 365)} an${days >= 730 ? 's' : ''}`;
  if (days >= 28) return `${Math.round(days / 30)} mois`;
  return `${days} jours`;
}

function periodLabel(start: string, end: string): string {
  const fmt = (d: string, withYear: boolean) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
  return `${fmt(start, false)} → ${fmt(end, true)}`;
}

/** Abonnement : formule en cours (carte héro) et autres formules proposées par la salle. */
export default function SubscriptionScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: memberships, refetch: refetchMemberships } = useMyMemberships();
  const { data: plans, isLoading, isError, refetch: refetchPlans } = usePlans();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetchMemberships(), refetchPlans()]));

  const active = memberships?.find((m) => m.status === 'ACTIVE');
  const expired = !active && memberships?.some((m) => m.status === 'EXPIRED');
  const daysLeft = active ? Math.max(0, Math.ceil((new Date(active.endDate).getTime() - Date.now()) / 86_400_000)) : 0;
  const ratio = active ? Math.min(1, daysLeft / Math.max(1, active.plan.durationDays)) : 0;
  const otherPlans = (plans ?? []).filter((p) => p.id !== active?.planId);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/profile'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Profil</Text>
        </Pressable>
        <ScreenTitle title="Abonnement" subtitle="Votre formule et les autres packs de la salle" />

        {active ? (
          <MembershipHeroCard
            planName={active.plan.name}
            periodLabel={periodLabel(active.startDate, active.endDate)}
            daysLeft={daysLeft}
            remainingRatio={ratio}
          />
        ) : (
          <View style={[styles.noPlan, cardShadow]}>
            <View style={styles.noPlanIcon}>
              <MaterialIcons name="card-membership" size={26} color={colors.primaryInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noPlanTitle}>{expired ? 'Abonnement expiré' : 'Aucun abonnement'}</Text>
              <Text style={styles.noPlanText}>Choisissez un pack ci-dessous et souscrivez à l’accueil de la salle.</Text>
            </View>
          </View>
        )}

        <View>
          <Text style={styles.sectionTitle}>{active ? 'Autres packs' : 'Nos packs'}</Text>
          {isError ? (
            <EmptyState
              icon="cloud-off"
              title="Packs indisponibles"
              text="Impossible de récupérer les formules pour le moment."
              tone="danger"
              actionLabel="Réessayer"
              onAction={() => refetchPlans()}
            />
          ) : !isLoading && otherPlans.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucun autre pack proposé pour le moment.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {otherPlans.map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.hint}>
          <MaterialIcons name="storefront" size={20} color={colors.primaryInk} />
          <Text style={styles.hintText}>La souscription et le renouvellement se font à l’accueil de la salle.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({ plan }: { plan: MembershipPlan }) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.planCard, cardShadow, plan.isPopular && styles.planCardPopular]}>
      <View style={styles.planTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planDuration}>{durationLabel(plan.durationDays)}</Text>
        </View>
        {plan.isPopular ? (
          <View style={styles.popular}>
            <Text style={styles.popularText}>Populaire</Text>
          </View>
        ) : null}
      </View>
      {plan.description ? <Text style={styles.planDescription}>{plan.description}</Text> : null}
      {plan.includesLabel ? (
        <View style={styles.includes}>
          <MaterialIcons name="check-circle" size={18} color={colors.primaryInk} />
          <Text style={styles.includesText}>{plan.includesLabel}</Text>
        </View>
      ) : null}
      <Text style={styles.price}>
        {Number(plan.price).toLocaleString('fr-FR')}
        <Text style={styles.priceUnit}> DT</Text>
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    sectionTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10 },
    noPlan: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    noPlanIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    noPlanTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    noPlanText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
    planCard: {
      padding: 16, gap: 10, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    planCardPopular: { borderColor: colors.primary, borderWidth: 1.5 },
    planTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    planName: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: colors.text },
    planDuration: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginTop: 2 },
    popular: { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 11, paddingVertical: 5 },
    popularText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryContrast },
    planDescription: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
    includes: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
    includesText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primaryInk },
    price: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -1, color: colors.text },
    priceUnit: { fontFamily: fonts.bodySemiBold, fontSize: 15, letterSpacing: 0, color: colors.muted },
    empty: { padding: 24, borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    hint: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft, borderRadius: 18, padding: 14 },
    hintText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primaryInk },
  });
}
