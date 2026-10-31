import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { StatusTag, membershipBadge } from './staffUi';

const RING = 104;
const STROKE = 5;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

interface Props {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  memberCode?: string | null;
  /** Part écoulée de l'abonnement en cours (0–1) : anneau autour de la photo. */
  ratio: number;
  /** Statut du dernier abonnement et jours restants : pastille « Actif / Expire bientôt / Expiré… ». */
  status?: string;
  daysLeft: number | null;
  /** Faux pour un rôle sans accès aux abonnements (coach) : pas d'anneau de progression ni de pastille de statut. */
  showSubscription?: boolean;
}

/** Profil simple d'un adhérent : photo dans l'anneau d'abonnement, nom, statut et code adhérent. */
export function MemberIdentity({ firstName, lastName, photoUrl, memberCode, ratio, status, daysLeft, showSubscription = true }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const badge = membershipBadge(status, daysLeft);
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  return (
    <View style={styles.identity}>
      <View style={{ width: RING, height: RING }}>
        {showSubscription ? (
        <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={colors.surface2} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            stroke={colors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={CIRC * (1 - ratio)}
          />
        </Svg>
        ) : (
          <View style={styles.plainRing} />
        )}
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={[styles.avatar, { backgroundColor: colors.surface2 }]} />
        ) : (
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
        )}
      </View>
      <Text style={styles.name}>{firstName} {lastName}</Text>
      <View style={styles.tagRow}>
        {showSubscription ? <StatusTag label={badge.label} tone={badge.tone} /> : null}
        {memberCode ? (
          <View style={styles.codeBadge}>
            <MaterialIcons name="pin" size={13} color={colors.primaryInk} />
            <Text style={styles.codeText}>{t('staff.code', { v1: memberCode.slice(0, 3), v3: memberCode.slice(3) })}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    identity: { alignItems: 'center', gap: 8, paddingBottom: 6 },
    avatar: { position: 'absolute', top: 9, left: 9, right: 9, bottom: 9, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
    plainRing: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: 48, borderWidth: 2, borderColor: colors.primaryBorder },
    avatarText: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -0.9, color: '#FFFFFF' },
    name: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -1, color: colors.text, textAlign: 'center' },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    codeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13,
      backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder,
    },
    codeText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: colors.primaryInk },
  });
}
