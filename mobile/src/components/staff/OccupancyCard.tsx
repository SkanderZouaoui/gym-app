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
import { Banner, BottomSheet, Chip, SkeletonBlock } from '../ui';
import { Button } from '../Button';
import { TextField } from '../TextField';
import { StatusTag } from './staffUi';

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

  if (isLoading) return <SkeletonBlock height={150} radius={radii.lg} />;
  if (!data) return null;

  const manual = data.source === 'MANUAL' && !!data.override;
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  const setByName = data.override?.setBy ? `${data.override.setBy.firstName} ${data.override.setBy.lastName.charAt(0)}.` : null;

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <MaterialIcons name="groups" size={22} color={colors.primaryInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>{t('occupancy.kicker')}</Text>
          <Text style={styles.value} numberOfLines={2} accessibilityRole="header">
            {data.estimate === 1 ? t('occupancy.estimate_single') : t('occupancy.estimate_many', { count: data.estimate })}
          </Text>
        </View>
      </View>
      {manual ? <StatusTag label={t('occupancy.manual_badge')} tone="warning" /> : null}

      <View style={styles.sourceRow}>
        <MaterialIcons name={manual ? 'edit' : 'wifi'} size={14} color={colors.muted} />
        <Text style={styles.source} numberOfLines={2}>
          {manual && data.override
            ? setByName
              ? t('occupancy.source_manual', { name: setByName, time: clock(data.override.expiresAt) })
              : t('occupancy.source_manual_noname', { time: clock(data.override.expiresAt) })
            : t('occupancy.source_auto', { wifi: data.wifiCount, other: data.otherNetworkCount })}
        </Text>
      </View>
      {manual && data.override?.note ? <Text style={styles.note} numberOfLines={2}>{t('occupancy.note_line', { note: data.override.note })}</Text> : null}
      <Text style={styles.hint}>{t('occupancy.approx_hint')}</Text>

      {!data.publicIpConfigured ? (
        <Pressable onPress={settingsHref ? () => router.push(settingsHref as never) : undefined} disabled={!settingsHref}>
          <Banner tone="warning" icon="wifi-off" text={t('occupancy.no_ip_warning')} />
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('occupancy.adjust')} variant="outline" onPress={() => setAdjusting(true)} />
        {manual ? <Button label={t('occupancy.back_to_auto')} variant="ghost" loading={clear.isPending} onPress={() => clear.mutate()} /> : null}
      </View>

      <AdjustSheet visible={adjusting} current={data} onClose={() => setAdjusting(false)} />
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
    card: { padding: 16, gap: 10, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.muted },
    value: { fontFamily: fonts.head, fontSize: 20, lineHeight: 25, letterSpacing: -0.5, color: colors.text, marginTop: 2 },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    source: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted },
    note: { fontFamily: fonts.body, fontSize: 13, fontStyle: 'italic', color: colors.text },
    hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.muted },
    actions: { gap: 8, marginTop: 2 },
    label: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sheetTitle: { fontFamily: fonts.headBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
  });
}
