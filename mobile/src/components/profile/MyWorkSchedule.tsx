import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useNow } from '../../hooks/useNow';
import { WEEKDAYS_LONG_MON } from '../../i18n/labels';
import { shiftBar, shiftDayIndex, shiftStatus, weekHours, type Shift } from '../../utils/workShift';

/** Largeur de la colonne « début – fin » à droite de chaque jour. */
const HOURS_W = 96;

/**
 * Planning de travail personnel (accueil, coach) : le créneau du jour avec l'état du moment (en poste, pas encore,
 * terminé, repos), puis la semaine en frises — chaque jour montre où tombe son créneau entre 06:00 et minuit.
 */
export function MyWorkSchedule({ days }: { days: Shift[] }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const now = new Date(useNow());
  const todayIndex = shiftDayIndex(now);
  const byDay = new Map(days.map((d) => [d.dayOfWeek, d]));
  const today = byDay.get(todayIndex);
  const status = shiftStatus(today, now);
  const statusText =
    status.kind === 'on' ? t('staff.ws_on_until', { time: status.endsAt })
    : status.kind === 'before' ? t('staff.ws_starts_at', { time: status.startsAt })
    : status.kind === 'done' ? t('staff.ws_done')
    : t('staff.ws_off');

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('common.mon_planning')}</Text>
        <Text style={styles.weekPill}>{t('staff.ws_week_hours', { hours: weekHours(days) })}</Text>
      </View>

      <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.decor} pointerEvents="none" />
        <Text style={styles.kicker}>{t('venue.today').toUpperCase()} · {WEEKDAYS_LONG_MON[todayIndex].toUpperCase()}</Text>
        {today?.working ? (
          <View style={styles.times}>
            <View>
              <Text style={styles.timeLabel}>{t('admin.debut').toUpperCase()}</Text>
              <Text style={styles.heroValue}>{today.startTime}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View>
              <Text style={styles.timeLabel}>{t('admin.fin').toUpperCase()}</Text>
              <Text style={styles.heroValue}>{today.endTime}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.heroValue}>{t('staff.ws_rest')}</Text>
        )}
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: status.kind === 'on' ? '#7CFFB0' : 'rgba(255,255,255,0.6)' }]} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </LinearGradient>

      <View style={[styles.card, cardShadow]}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = byDay.get(i);
          const bar = shiftBar(d);
          const isToday = i === todayIndex;
          return (
            <View key={i} style={[styles.row, i > 0 && styles.rowBorder, isToday && styles.rowToday]}>
              <Text style={[styles.day, isToday && styles.dayToday, !bar && { color: colors.muted }]} numberOfLines={1}>{WEEKDAYS_LONG_MON[i]}</Text>
              <View style={styles.track}>
                {bar ? <View style={[styles.fill, { left: `${bar.from * 100}%`, width: `${Math.max(2, (bar.to - bar.from) * 100)}%`, backgroundColor: isToday ? colors.primary : colors.primaryBorder }]} /> : null}
              </View>
              <Text style={[styles.hours, !bar && { color: colors.muted }]} numberOfLines={1}>{bar && d ? `${d.startTime} – ${d.endTime}` : t('staff.ws_rest')}</Text>
            </View>
          );
        })}
        <View style={styles.legend}>
          <Text style={styles.legendText}>06:00</Text>
          <Text style={styles.legendText}>12:00</Text>
          <Text style={styles.legendText}>00:00</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted, textTransform: 'uppercase', marginLeft: 4 },
    weekPill: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 11, overflow: 'hidden' },
    hero: { borderRadius: radii.xl, padding: 16, gap: 6, overflow: 'hidden' },
    decor: { position: 'absolute', right: -40, top: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.10)' },
    kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: 'rgba(255,255,255,0.75)' },
    heroValue: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -0.8, color: '#FFFFFF' },
    times: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
    timeLabel: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 0.8, color: 'rgba(255,255,255,0.7)' },
    arrow: { fontFamily: fonts.head, fontSize: 22, color: 'rgba(255,255,255,0.7)', paddingBottom: 3 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 11, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: '#FFFFFF' },
    card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 46 },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    rowToday: { backgroundColor: colors.primarySoft },
    day: { width: 78, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    dayToday: { fontFamily: fonts.bodyBold, color: colors.primaryInk },
    track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.surface2, overflow: 'hidden' },
    fill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 5 },
    hours: { width: HOURS_W, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    legend: { flexDirection: 'row', justifyContent: 'space-between', paddingStart: 14 + 78 + 10, paddingEnd: 14 + HOURS_W + 10, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    legendText: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.muted },
  });
}
