import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { dateLocale } from '../../i18n';
import { groupByPeriod, nowMarkerIndex, type Period } from '../../utils/planning';
import { ProgressBar } from '../ui';
import { StatusTag } from '../staff/staffUi';

export interface TimelineSession {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  /** Éléments d'information sous le titre (coach, salle, présents…), séparés par « · ». */
  meta: string[];
  booked: number;
  capacity: number;
  state: { key: 'done' | 'live' | 'cancelled' | 'full' | 'almost' | 'open'; label: string; tone: 'muted' | 'success' | 'danger' | 'warning'; ratio: number };
}

const PERIOD_ICON: Record<Period, keyof typeof MaterialIcons.glyphMap> = { morning: 'wb-twilight', afternoon: 'wb-sunny', evening: 'nights-stay' };
const RAIL = 22;

/**
 * Journée de cours en frise verticale : regroupée en matin / après-midi / soir, chaque cours sur un rail (point vert s'il
 * est en cours, grisé s'il est terminé) avec son horaire à gauche, et un repère « Maintenant » entre les cours quand le jour
 * affiché est aujourd'hui.
 */
export function SessionTimeline({
  sessions,
  now,
  isToday,
  onPress,
  renderAction,
}: {
  sessions: TimelineSession[];
  now: number;
  isToday: boolean;
  onPress: (id: string) => void;
  renderAction?: (session: TimelineSession) => ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const marker = isToday ? nowMarkerIndex(sessions, now) : null;
  const groups = groupByPeriod(sessions);
  const time = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

  let index = 0;
  return (
    <View style={{ gap: 6 }}>
      {groups.map((g) => (
        <View key={g.period}>
          <View style={styles.periodRow}>
            <MaterialIcons name={PERIOD_ICON[g.period]} size={18} color={colors.primaryInk} />
            <Text style={styles.periodText}>{t(`staff.period_${g.period}`)}</Text>
            <Text style={styles.periodCount}>{g.items.length}</Text>
          </View>
          {g.items.map((s) => {
            const i = index++;
            return (
              <View key={s.id}>
                {marker === i ? <NowRow label={t('staff.maintenant')} time={time(new Date(now).toISOString())} styles={styles} colors={colors} /> : null}
                <Row session={s} time={time} onPress={onPress} action={renderAction?.(s)} styles={styles} colors={colors} />
                {marker === sessions.length && i === sessions.length - 1 ? <NowRow label={t('staff.maintenant')} time={time(new Date(now).toISOString())} styles={styles} colors={colors} /> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;
type Colors = ReturnType<typeof useTheme>['colors'];

function NowRow({ label, time, styles, colors }: { label: string; time: string; styles: Styles; colors: Colors }) {
  return (
    <View style={styles.nowRow}>
      <Text style={[styles.time, { color: colors.primaryInk }]}>{time}</Text>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: colors.primary, top: 7, width: 12, height: 12, borderRadius: 6 }]} />
      </View>
      <View style={styles.nowLineWrap}>
        <Text style={styles.nowLabel}>{label}</Text>
        <View style={[styles.nowLine, { backgroundColor: colors.primary }]} />
      </View>
    </View>
  );
}

function Row({
  session: s,
  time,
  onPress,
  action,
  styles,
  colors,
}: {
  session: TimelineSession;
  time: (iso: string) => string;
  onPress: (id: string) => void;
  action: ReactNode;
  styles: Styles;
  colors: Colors;
}) {
  const live = s.state.key === 'live';
  const dim = s.state.key === 'done' || s.state.key === 'cancelled';
  const minutes = Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000);
  const barColor = s.state.ratio >= 1 ? colors.danger : s.state.ratio >= 0.7 ? colors.warning : colors.primary;
  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text style={[styles.time, dim && { color: colors.muted }, live && { color: colors.successInk }]}>{time(s.startsAt)}</Text>
        <Text style={styles.duration}>{minutes} min</Text>
      </View>
      <View style={styles.rail}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <View style={[styles.dot, { backgroundColor: live ? colors.success : dim ? colors.border : colors.primary }, live && styles.dotLive]} />
      </View>
      <Pressable
        onPress={() => onPress(s.id)}
        style={({ pressed }) => [styles.card, live && { borderColor: colors.success, backgroundColor: colors.successSoft }, dim && { opacity: 0.65 }, pressed && { transform: [{ scale: 0.98 }] }]}
        accessibilityRole="button"
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.title, s.state.key === 'cancelled' && { textDecorationLine: 'line-through', color: colors.muted }]} numberOfLines={2}>{s.title}</Text>
            {s.meta.length > 0 ? <Text style={styles.meta} numberOfLines={2}>{s.meta.join(' · ')}</Text> : null}
          </View>
          {action}
        </View>
        <View style={styles.fillRow}>
          <ProgressBar progress={s.state.ratio} color={barColor} />
          <Text style={styles.fillText}>{s.booked}/{s.capacity}</Text>
        </View>
        <StatusTag label={s.state.label} tone={s.state.tone} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    periodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8 },
    periodText: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text },
    periodCount: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.primaryInk, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9, overflow: 'hidden' },
    row: { flexDirection: 'row', paddingBottom: 12 },
    nowRow: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 8 },
    timeCol: { width: 52, paddingTop: 12 },
    time: { width: 52, fontFamily: fonts.head, fontSize: 15, letterSpacing: -0.3, color: colors.text, paddingTop: 0 },
    duration: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, marginTop: 1 },
    rail: { width: RAIL, alignItems: 'center', alignSelf: 'stretch' },
    line: { position: 'absolute', top: 0, bottom: -12, width: 2, borderRadius: 1 },
    dot: { position: 'absolute', top: 16, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.bg },
    dotLive: { width: 14, height: 14, borderRadius: 7, top: 14 },
    card: { flex: 1, minWidth: 0, gap: 10, padding: 12, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    title: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 2 },
    fillRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text, minWidth: 34, textAlign: 'right' },
    nowLineWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
    nowLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.primaryInk },
    nowLine: { flex: 1, height: 2, borderRadius: 1, opacity: 0.5 },
  });
}
