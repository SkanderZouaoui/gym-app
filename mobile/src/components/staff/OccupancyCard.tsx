import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DEFAULT_OCCUPANCY_POLICY, type OccupancyEstimate } from '@muscleup/shared';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { dateLocale } from '../../i18n';
import { useClearOccupancyOverride, useOccupancy, useSetOccupancyOverride } from '../../hooks/useOccupancy';
import { LinearGradient } from 'expo-linear-gradient';
import { Banner, BottomSheet, Chip, SectionHeader, SkeletonBlock } from '../ui';
import { Button } from '../Button';
import { TextField } from '../TextField';

/** Valeur spéciale « jusqu'à nouvel ordre » : le serveur la borne à la durée maximale (l'override expire toujours). */
const UNTIL_FURTHER_NOTICE = 1440;
const DURATIONS = [15, 30, 60, UNTIL_FURTHER_NOTICE] as const;

/**
 * Fréquentation estimée de la salle (accueil / admin).
 * ⚠️ Approximation (WiFi de la salle + activité de l'app) : toujours « Estimation ≈ N », jamais « N personnes ».
 * La source (WiFi / app / manuel) est affichée discrètement, pour la transparence de l'équipe.
 */
export function OccupancyCard({ settingsHref }: { settingsHref?: string }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading } = useOccupancy();
  const clear = useClearOccupancyOverride();
  const [adjusting, setAdjusting] = useState(false);

  if (isLoading) return <SkeletonBlock height={190} radius={radii.xl} />;
  if (!data) return null;

  const manual = data.source === 'MANUAL' && !!data.override;
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  const setByName = data.override?.setBy ? `${data.override.setBy.firstName} ${data.override.setBy.lastName.charAt(0)}.` : null;

  return (
    <View style={{ gap: 10 }}>
      <SectionHeader
        icon="groups"
        title={t('occupancy.title')}
        actionLabel={settingsHref ? t('occupancy.settings_link') : undefined}
        onAction={settingsHref ? () => router.push(settingsHref as never) : undefined}
      />
      <View style={[styles.card, cardShadow]}>
        <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.decor} pointerEvents="none" />
          <Text style={styles.kicker}>{t('occupancy.kicker')}</Text>
          <View style={styles.valueRow} accessibilityRole="header" accessibilityLabel={data.estimate === 1 ? t('occupancy.estimate_single') : t('occupancy.estimate_many', { count: data.estimate })}>
            <Text style={styles.approx}>≈</Text>
            <Text style={styles.value}>{data.estimate}</Text>
            <MaterialIcons name="groups" size={26} color="rgba(255,255,255,0.75)" style={{ marginBottom: 6 }} />
          </View>
          <View style={styles.pills}>
            <View style={styles.pill}>
              <MaterialIcons name={manual ? 'edit' : 'wifi'} size={13} color="#FFFFFF" />
              <Text style={styles.pillText} numberOfLines={1}>
                {manual && data.override
                  ? setByName
                    ? t('occupancy.source_manual', { name: setByName, time: clock(data.override.expiresAt) })
                    : t('occupancy.source_manual_noname', { time: clock(data.override.expiresAt) })
                  : t('occupancy.source_auto', { wifi: data.wifiCount, other: data.otherNetworkCount })}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {manual && data.override?.note ? <Text style={styles.note} numberOfLines={2}>{t('occupancy.note_line', { note: data.override.note })}</Text> : null}
        <Text style={styles.hint}>{t('occupancy.approx_hint')}</Text>

        {!data.publicIpConfigured ? (
          <Pressable onPress={settingsHref ? () => router.push(settingsHref as never) : undefined} disabled={!settingsHref}>
            <Banner tone="warning" icon="wifi-off" text={t('occupancy.no_ip_warning')} />
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]} onPress={() => setAdjusting(true)} accessibilityRole="button">
            <MaterialIcons name="tune" size={20} color={colors.primaryInk} />
            <Text style={styles.actionText}>{t('occupancy.adjust')}</Text>
          </Pressable>
          {manual ? (
            <Pressable style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }, clear.isPending && { opacity: 0.5 }]} onPress={() => clear.mutate()} disabled={clear.isPending} accessibilityRole="button">
              <MaterialIcons name="autorenew" size={20} color={colors.primaryInk} />
              <Text style={styles.actionText}>{t('occupancy.back_to_auto')}</Text>
            </Pressable>
          ) : null}
        </View>

        <AdjustSheet visible={adjusting} current={data} onClose={() => setAdjusting(false)} />
      </View>
    </View>
  );
}

function AdjustSheet({ visible, current, onClose }: { visible: boolean; current: OccupancyEstimate; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const save = useSetOccupancyOverride();
  const [count, setCount] = useState(String(current.estimate));
  const [duration, setDuration] = useState<number>(30);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const valid = count.trim() !== '' && Number(count) >= 0 && Number(count) <= 10_000;

  const durationLabel = (d: number) =>
    d === 15 ? t('occupancy.d15') : d === 30 ? t('occupancy.d30') : d === 60 ? t('occupancy.d60') : t('occupancy.until');

  const submit = () => {
    setError(null);
    save.mutate(
      { count: Number(count), durationMinutes: duration, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setNote('');
          onClose();
        },
        onError: () => setError(t('occupancy.error')),
      },
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text style={styles.sheetTitle}>{t('occupancy.sheet_title')}</Text>
          <Text style={styles.sheetText}>{t('occupancy.sheet_text')}</Text>
        </View>
        <TextField
          label={t('occupancy.count_label')}
          icon="groups"
          value={count}
          onChangeText={(v) => setCount(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>{t('occupancy.duration_label')}</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={durationLabel(d)} active={duration === d} onPress={() => setDuration(d)} />
            ))}
          </View>
          {duration === UNTIL_FURTHER_NOTICE ? (
            <Text style={styles.sheetText}>
              {t('occupancy.until_hint', { hours: Math.round(DEFAULT_OCCUPANCY_POLICY.manualOverrideMaxDurationMinutes / 60) })}
            </Text>
          ) : null}
        </View>
        <TextField
          label={t('occupancy.note_label')}
          icon="sticky-note-2"
          value={note}
          onChangeText={setNote}
          placeholder={t('occupancy.note_placeholder')}
          maxLength={200}
        />
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}
        <Button label={t('occupancy.save')} onPress={submit} loading={save.isPending} disabled={!valid} />
      </View>
    </BottomSheet>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: { padding: 12, gap: 12, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    hero: { borderRadius: 20, padding: 16, gap: 6, overflow: 'hidden' },
    decor: { position: 'absolute', right: -40, top: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.10)' },
    kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.9, color: 'rgba(255,255,255,0.78)' },
    valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    approx: { fontFamily: fonts.head, fontSize: 28, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
    value: { fontFamily: fonts.head, fontSize: 52, lineHeight: 56, letterSpacing: -2, color: '#FFFFFF' },
    pills: { flexDirection: 'row', marginTop: 2 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.18)' },
    pillText: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    note: { fontFamily: fonts.body, fontSize: 13, fontStyle: 'italic', color: colors.text, paddingHorizontal: 4 },
    hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.muted, paddingHorizontal: 4 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.primarySoft },
    actionText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.primaryInk },
    label: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sheetTitle: { fontFamily: fonts.headBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
  });
}
