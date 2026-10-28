import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

type IconName = keyof typeof MaterialIcons.glyphMap;

// --- Chiffres clés ---------------------------------------------------------

export function ProfileStats({ stats }: { stats: { label: string; value: number; unit?: string }[] }) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.statsRow}>
      {stats.map((s) => (
        <View key={s.label} style={[styles.statCard, cardShadow]}>
          <Text style={styles.statValue}>
            {s.value}
            {s.unit ? <Text style={styles.statUnit}>{s.unit}</Text> : null}
          </Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// --- Activité (barres) + objectif (anneau) ----------------------------------

const GOAL_RING = 84;
const GOAL_STROKE = 8;
const GOAL_R = (GOAL_RING - GOAL_STROKE) / 2;
const GOAL_CIRC = 2 * Math.PI * GOAL_R;

export function ProfileActivity({ weeks, goalDone, goalTarget }: { weeks: number[]; goalDone: number; goalTarget: number }) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const max = Math.max(...weeks, 1);
  const ratio = Math.min(1, goalDone / Math.max(1, goalTarget));
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityCard, cardShadow, { flex: 1.35 }]}>
        <Text style={styles.cardTitle}>Activité · 8 sem.</Text>
        <View style={styles.bars}>
          {weeks.map((count, i) => {
            const last = i === weeks.length - 1;
            const h = Math.max(6, Math.round((count / max) * 78));
            return (
              <LinearGradient
                key={i}
                colors={last ? [colors.primaryInk, colors.primary] : [colors.primary, colors.primaryPressed]}
                style={{ flex: 1, height: h, borderRadius: 6, opacity: last ? 1 : 0.55 + i * 0.04 }}
              />
            );
          })}
        </View>
      </View>
      <View style={[styles.activityCard, cardShadow, { flex: 1, alignItems: 'center', gap: 6 }]}>
        <Text style={[styles.cardTitle, { alignSelf: 'flex-start' }]}>Objectif</Text>
        <View style={styles.goalBox}>
          <Svg width={GOAL_RING} height={GOAL_RING} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={GOAL_RING / 2} cy={GOAL_RING / 2} r={GOAL_R} stroke={colors.surface2} strokeWidth={GOAL_STROKE} fill="none" />
            <Circle
              cx={GOAL_RING / 2}
              cy={GOAL_RING / 2}
              r={GOAL_R}
              stroke={colors.primary}
              strokeWidth={GOAL_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${GOAL_CIRC} ${GOAL_CIRC}`}
              strokeDashoffset={GOAL_CIRC * (1 - ratio)}
            />
          </Svg>
          <View style={styles.goalCenter}>
            <Text style={styles.goalText}>{goalDone}/{goalTarget}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// --- Badges -----------------------------------------------------------------

export interface BadgeInfo {
  icon: IconName;
  label: string;
  unlocked: boolean;
}

export function ProfileBadges({ badges }: { badges: BadgeInfo[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.badgesRow}>
      {badges.map((b) => (
        <View key={b.label} style={styles.badge}>
          {b.unlocked ? (
            <View style={styles.badgeShadow}>
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badgeTile}>
                <MaterialIcons name={b.icon} size={30} color="#FFFFFF" />
              </LinearGradient>
            </View>
          ) : (
            <View style={[styles.badgeTile, styles.badgeLocked]}>
              <MaterialIcons name="lock" size={30} color={colors.muted} />
            </View>
          )}
          <Text style={styles.badgeLabel}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

// --- Groupes de réglages ------------------------------------------------------

export type SettingsRowDef =
  | { kind: 'switch'; icon: IconName; title: string; sub?: string; value: boolean; onChange: (v: boolean) => void }
  | { kind: 'nav'; icon: IconName; title: string; sub?: string; value?: string; onPress: () => void; danger?: boolean }
  | { kind: 'segment'; icon: IconName; title: string; options: { value: string; label: string }[]; selected: string; onChange: (v: string) => void };

export function SettingsGroup({ title, rows }: { title: string; rows: SettingsRowDef[] }) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={[styles.groupCard, cardShadow]}>
        {rows.map((row, i) => (
          <SettingsRow key={row.title} row={row} last={i === rows.length - 1} />
        ))}
      </View>
    </View>
  );
}

function SettingsRow({ row, last }: { row: SettingsRowDef; last: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const body = (
    <>
      <View style={styles.rowIcon}>
        <MaterialIcons name={row.icon} size={22} color={colors.primaryInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle}>{row.title}</Text>
        {'sub' in row && row.sub ? <Text style={styles.rowSub}>{row.sub}</Text> : null}
      </View>
      {row.kind === 'switch' ? (
        <Switch
          value={row.value}
          onValueChange={row.onChange}
          trackColor={{ true: colors.primary, false: colors.surface2 }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.surface2}
        />
      ) : row.kind === 'nav' ? (
        <>
          {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
          <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
        </>
      ) : (
        <View style={styles.segment}>
          {row.options.map((o) => {
            const active = o.value === row.selected;
            return (
              <Pressable key={o.value} onPress={() => row.onChange(o.value)} style={[styles.segmentItem, active && styles.segmentItemActive]}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
  const containerStyle = [styles.row, !last && styles.rowBorder];
  return row.kind === 'nav' ? (
    <Pressable style={containerStyle} onPress={row.onPress}>
      {body}
    </Pressable>
  ) : (
    <View style={containerStyle}>{body}</View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1, paddingVertical: 16, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: radii.lg,
      borderWidth: 1, borderColor: colors.border,
    },
    statValue: { fontFamily: fonts.head, fontSize: 30, lineHeight: 32, letterSpacing: -1.4, color: colors.text },
    statUnit: { fontFamily: fonts.bodySemiBold, fontSize: 14, letterSpacing: 0, color: colors.muted },
    statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginTop: 8 },
    activityRow: { flexDirection: 'row', gap: 10 },
    activityCard: { padding: 16, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    cardTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 84, marginTop: 12 },
    goalBox: { width: GOAL_RING, height: GOAL_RING },
    goalCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    goalText: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.4, color: colors.text },
    badgesRow: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
    badge: { width: 84, alignItems: 'center', gap: 8 },
    badgeShadow: {
      borderRadius: 22, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
    },
    badgeTile: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    badgeLocked: { backgroundColor: colors.surface2, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
    badgeLabel: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, textAlign: 'center', color: colors.muted },
    groupTitle: {
      fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.8, color: colors.muted, textTransform: 'uppercase',
      marginLeft: 6, marginBottom: 8,
    },
    groupCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 12, paddingHorizontal: 14 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    rowSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    rowValue: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
    segment: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 12, padding: 3, gap: 2 },
    segmentItem: { height: 34, paddingHorizontal: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    segmentItemActive: { backgroundColor: colors.primary },
    segmentText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    segmentTextActive: { color: colors.primaryContrast },
  });
}
