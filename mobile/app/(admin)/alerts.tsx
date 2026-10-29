import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAdminHomeAlerts, useSaveHomeAlert } from '../../src/hooks/useAdmin';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { ScreenTitle } from '../../src/components/ui';

const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Alertes adhérents : bandeaux affichés en haut de l'accueil de l'application (période, audience, niveau). */
export default function AdminAlertsScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: alerts, refetch } = useAdminHomeAlerts();
  const save = useSaveHomeAlert();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'ended'>('all');
  const today = new Date().toISOString().slice(0, 10);
  const statusOf = (a: { isActive: boolean; startsOn: string; endsOn: string }): 'active' | 'scheduled' | 'ended' | 'off' =>
    !a.isActive ? 'off' : a.endsOn.slice(0, 10) < today ? 'ended' : a.startsOn.slice(0, 10) > today ? 'scheduled' : 'active';
  const STATUS_LABEL = { active: 'Active', scheduled: 'Programmée', ended: 'Terminée', off: 'Désactivée' } as const;
  const all = alerts ?? [];
  const counts = {
    all: all.length,
    active: all.filter((a) => statusOf(a) === 'active').length,
    scheduled: all.filter((a) => statusOf(a) === 'scheduled').length,
    ended: all.filter((a) => statusOf(a) === 'ended' || statusOf(a) === 'off').length,
  };
  const shown = all.filter((a) => filter === 'all' || (filter === 'ended' ? ['ended', 'off'].includes(statusOf(a)) : statusOf(a) === filter));
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  const tone = (level: string) =>
    level === 'urgent'
      ? { bg: colors.dangerSoft, ink: colors.dangerInk, icon: 'error' as const, label: 'Urgent' }
      : level === 'warn'
        ? { bg: colors.warningSoft, ink: colors.warningInk, icon: 'warning' as const, label: 'Avertissement' }
        : { bg: colors.primarySoft, ink: colors.primaryInk, icon: 'info' as const, label: 'Information' };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Plus</Text>
        </Pressable>
        <ScreenTitle
          title="Alertes adhérents"
          subtitle="Bandeaux sur l’accueil de l’app"
          right={
            <Pressable
              accessibilityLabel="Créer une alerte"
              onPress={() => router.push('/(admin)/alert-form')}
              style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                <MaterialIcons name="add" size={28} color={colors.primaryContrast} />
              </LinearGradient>
            </Pressable>
          }
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {([['all', 'Toutes'], ['active', 'Actives'], ['scheduled', 'Programmées'], ['ended', 'Terminées']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setFilter(k)} style={[styles.filterChip, filter === k && styles.filterChipOn]}>
              <Text style={[styles.filterText, filter === k && { color: colors.primaryContrast }]}>{l} · {counts[k]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ gap: 10 }}>
          {shown.map((a) => {
            const t = tone(a.level);
            return (
              <Pressable
                key={a.id}
                style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }, !a.isActive && { opacity: 0.6 }]}
                onPress={() => router.push({ pathname: '/(admin)/alert-form', params: { id: a.id } })}
              >
                <View style={[styles.iconBox, { backgroundColor: t.bg }]}>
                  <MaterialIcons name={t.icon} size={24} color={t.ink} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{a.title}</Text>
                  <View style={styles.tagRow}>
                    <View style={[styles.tag, { backgroundColor: t.bg }]}><Text style={[styles.tagText, { color: t.ink }]}>{t.label}</Text></View>
                    <View style={[styles.tag, { backgroundColor: statusOf(a) === 'active' ? colors.successSoft : statusOf(a) === 'scheduled' ? colors.warningSoft : colors.surface2 }]}>
                      <Text style={[styles.tagText, { color: statusOf(a) === 'active' ? colors.successInk : statusOf(a) === 'scheduled' ? colors.warningInk : colors.muted }]}>{STATUS_LABEL[statusOf(a)]}</Text>
                    </View>
                  </View>
                  <View style={styles.whenRow}>
                    <MaterialIcons name="event" size={14} color={colors.primaryInk} />
                    <Text style={styles.cardMeta}>{fmt(a.startsOn)} → {fmt(a.endsOn)} · {a.audience}</Text>
                  </View>
                </View>
                <Switch
                  value={a.isActive}
                  onValueChange={(v) => save.mutate({ id: a.id, data: { isActive: v } })}
                  trackColor={{ true: colors.primary, false: colors.surface2 }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.surface2}
                />
              </Pressable>
            );
          })}
          {shown.length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <MaterialIcons name="notification-important" size={34} color={colors.primaryInk} />
              <Text style={styles.emptyText}>Aucune alerte dans cette catégorie.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    addShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 6 },
    addButton: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    iconBox: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    filterChip: { height: 38, paddingHorizontal: 14, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    filterChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    tagRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
    tagText: { fontFamily: fonts.bodyBold, fontSize: 11 },
    whenRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
    cardMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  });
}
