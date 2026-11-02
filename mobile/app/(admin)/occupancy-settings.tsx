import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { OccupancyPolicy } from '@muscleup/shared';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useOccupancySettings, useSaveOccupancySettings } from '../../src/hooks/useOccupancy';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { ApiError } from '../../src/api/client';
import { Banner, SkeletonBlock } from '../../src/components/ui';
import { KeyboardAwareScreen } from '../../src/components/ui/KeyboardAwareScreen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';

type Form = Record<'publicIp' | 'wifiWeight' | 'otherNetworkWeight' | 'presenceWindowMinutes' | 'defaultDuration' | 'maxDuration', string> & {
  visibleToMembers: boolean;
};

const decimal = (v: string) => v.replace(',', '.').replace(/[^0-9.]/g, '');
const integer = (v: string) => v.replace(/[^0-9]/g, '');

/**
 * Présence et occupation (admin) : IP publique du WiFi de la salle, pondération des signaux et durées.
 * L'estimation obtenue reste une approximation, jamais un comptage exact.
 */
export default function OccupancySettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data, refetch, isLoading } = useOccupancySettings();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const save = useSaveOccupancySettings();
  const [patch, setPatch] = useState<Partial<Form>>({});
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const base: Form | null = data
    ? {
        publicIp: data.publicIp ?? '',
        wifiWeight: String(data.policy.wifiWeight),
        otherNetworkWeight: String(data.policy.otherNetworkWeight),
        presenceWindowMinutes: String(data.policy.presenceWindowMinutes),
        defaultDuration: String(data.policy.manualOverrideDefaultDurationMinutes),
        maxDuration: String(data.policy.manualOverrideMaxDurationMinutes),
        visibleToMembers: data.policy.visibleToMembers,
      }
    : null;
  const form = base ? { ...base, ...patch } : null;
  const set = (p: Partial<Form>) => setPatch((prev) => ({ ...prev, ...p }));
  const dirty = !!base && (Object.keys(patch) as (keyof Form)[]).some((k) => patch[k] !== base[k]);

  const submit = () => {
    if (!form) return;
    setMessage(null);
    const policy: OccupancyPolicy = {
      wifiWeight: Number(form.wifiWeight),
      otherNetworkWeight: Number(form.otherNetworkWeight),
      presenceWindowMinutes: Number(form.presenceWindowMinutes),
      manualOverrideDefaultDurationMinutes: Number(form.defaultDuration),
      manualOverrideMaxDurationMinutes: Number(form.maxDuration),
      visibleToMembers: form.visibleToMembers,
    };
    save.mutate(
      { ...policy, publicIp: form.publicIp.trim() || null },
      {
        onSuccess: () => {
          setPatch({});
          setMessage({ tone: 'success', text: t('occupancy.saved') });
        },
        onError: (err) => {
          const code = err instanceof ApiError ? err.code : '';
          setMessage({
            tone: 'danger',
            text:
              code === 'INVALID_PUBLIC_IP'
                ? t('occupancy.invalid_ip')
                : code === 'OVERRIDE_DEFAULT_EXCEEDS_MAX'
                  ? t('occupancy.default_exceeds_max')
                  : t('occupancy.error'),
          });
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAwareScreen
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        footer={
          <View style={styles.footer}>
            <Button label={t('member.enregistrer')} onPress={submit} loading={save.isPending} disabled={!dirty} />
          </View>
        }
      >
        <ScreenHeader title={t('occupancy.settings_title')} fallbackHref="/(admin)/(tabs)" />

        {isLoading || !form || !data ? (
          <SkeletonBlock height={320} radius={radii.lg} />
        ) : (
          <>
            <Banner tone="info" icon="info-outline" text={t('occupancy.approx_hint')} />
            {message ? <Banner tone={message.tone} icon={message.tone === 'success' ? 'check-circle' : 'error'} text={message.text} /> : null}

            <Text style={styles.section}>{t('occupancy.ip_section')}</Text>
            <TextField
              label={t('occupancy.ip_label')}
              icon="wifi"
              value={form.publicIp}
              onChangeText={(v) => set({ publicIp: v })}
              placeholder="203.0.113.7"
              hint={t('occupancy.ip_hint')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />
            {data.requestIp ? (
              <Pressable
                onPress={() => set({ publicIp: data.requestIp ?? '' })}
                style={({ pressed }) => [styles.useIp, pressed && { transform: [{ scale: 0.98 }] }]}
                accessibilityRole="button"
              >
                <MaterialIcons name="my-location" size={18} color={colors.primaryInk} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.useIpTitle}>{t('occupancy.use_my_ip', { ip: data.requestIp })}</Text>
                  <Text style={styles.toggleHint}>{t('occupancy.use_my_ip_hint')}</Text>
                </View>
              </Pressable>
            ) : null}

            <Text style={styles.section}>{t('occupancy.weights_section')}</Text>
            <Text style={styles.toggleHint}>
              {t('occupancy.formula', { w: form.wifiWeight || '0', o: form.otherNetworkWeight || '0' })}
            </Text>
            <TextField label={t('occupancy.wifi_weight')} icon="wifi" value={form.wifiWeight} onChangeText={(v) => set({ wifiWeight: decimal(v) })} keyboardType="decimal-pad" />
            <TextField label={t('occupancy.other_weight')} icon="smartphone" value={form.otherNetworkWeight} onChangeText={(v) => set({ otherNetworkWeight: decimal(v) })} keyboardType="decimal-pad" />
            <TextField
              label={t('occupancy.window')}
              icon="schedule"
              value={form.presenceWindowMinutes}
              onChangeText={(v) => set({ presenceWindowMinutes: integer(v) })}
              hint={t('occupancy.window_hint')}
              keyboardType="number-pad"
            />

            <Text style={styles.section}>{t('occupancy.manual_section')}</Text>
            <TextField label={t('occupancy.default_duration')} icon="timer" value={form.defaultDuration} onChangeText={(v) => set({ defaultDuration: integer(v) })} keyboardType="number-pad" />
            <TextField
              label={t('occupancy.max_duration')}
              icon="timer-off"
              value={form.maxDuration}
              onChangeText={(v) => set({ maxDuration: integer(v) })}
              hint={t('occupancy.max_duration_hint')}
              keyboardType="number-pad"
            />

            <View style={styles.toggleCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>{t('occupancy.visible_members')}</Text>
                <Text style={styles.toggleHint}>{t('occupancy.visible_members_hint')}</Text>
              </View>
              <Switch
                value={form.visibleToMembers}
                onValueChange={(v) => set({ visibleToMembers: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </>
        )}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: 14, paddingBottom: spacing.xl },
    section: { fontFamily: fonts.headBold, fontSize: 16, letterSpacing: -0.3, color: colors.text, marginTop: 6 },
    useIp: {
      flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.lg,
      backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border,
    },
    useIpTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    toggleCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.xl,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    toggleTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    toggleHint: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 2 },
    footer: { backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl },
  });
}
