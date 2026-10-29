import { useMemo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { fonts, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Pill, type PillTone } from '../ui';

interface ProfileHeaderProps {
  initials: string;
  photoUrl?: string | null;
  name: string;
  subtitle?: string;
  /** Code de pointage à 6 chiffres, affiché en badge sous le sous-titre. */
  memberCode?: string;
  /** Complétion du profil, entre 0 et 1 : anneau autour de l'avatar. */
  completion: number;
  tags?: { label: string; tone: PillTone }[];
}

const SIZE = 132;
const STROKE = 7;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/** En-tête de Profil v2 : avatar en dégradé dans un anneau de complétion, nom 30 pt, pastilles. */
export function ProfileHeader({ initials, photoUrl, name, subtitle, memberCode, completion, tags }: ProfileHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pct = Math.round(Math.min(1, Math.max(0, completion)) * 100);
  return (
    <View style={styles.wrap}>
      <View style={styles.ringBox}>
        <Svg width={SIZE} height={SIZE} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.surface2} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={CIRC * (1 - pct / 100)}
          />
        </Svg>
        <View style={styles.avatarShadow}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.initials}>{initials}</Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.pct}>
          <Text style={styles.pctText}>{pct}%</Text>
        </View>
      </View>
      <Text style={styles.name}>{name}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {memberCode ? (
        <View style={styles.codeBadge}>
          <MaterialIcons name="pin" size={14} color={colors.primaryInk} />
          <Text style={styles.codeLabel}>Code</Text>
          <Text style={styles.codeValue}>{memberCode.slice(0, 3)} {memberCode.slice(3)}</Text>
        </View>
      ) : null}
      {tags && tags.length > 0 ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Pill key={tag.label} label={tag.label} tone={tag.tone} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', paddingTop: 8 },
    ringBox: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
    avatarShadow: {
      width: 106, height: 106, borderRadius: 53, shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
    },
    avatar: { width: 106, height: 106, borderRadius: 53, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
    initials: { fontFamily: fonts.head, fontSize: 38, letterSpacing: -1.1, color: '#FFFFFF' },
    pct: {
      position: 'absolute', bottom: 0, width: 52, alignItems: 'center', paddingVertical: 3, borderRadius: 999,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    pctText: { fontFamily: fonts.head, fontSize: 11, color: colors.primaryInk },
    name: { ...typography.largeTitle, fontSize: 30, letterSpacing: -1, color: colors.text, marginTop: 14, textAlign: 'center' },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 2 },
    codeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 12, height: 30, borderRadius: 999,
      backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder,
    },
    codeLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primaryInk },
    codeValue: { fontFamily: fonts.head, fontSize: 13, letterSpacing: 1.5, color: colors.primaryInk },
    tags: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  });
}
