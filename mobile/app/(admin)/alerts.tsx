import { useMemo } from 'react';
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

        <View style={{ gap: 10 }}>
          {(alerts ?? []).map((a) => {
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
                  <Text style={styles.cardMeta}>{t.label} · {a.audience} · {fmt(a.startsOn)} → {fmt(a.endsOn)}</Text>
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
          {(alerts ?? []).length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <MaterialIcons name="notification-important" size={34} color={colors.primaryInk} />
              <Text style={styles.emptyText}>Aucune alerte. Créez-en une pour l’afficher sur l’accueil des adhérents.</Text>
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
    cardMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  });
}
