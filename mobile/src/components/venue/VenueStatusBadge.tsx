import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useNow } from '../../hooks/useNow';
import { venueStatus, type DayHours } from '../../utils/openingHours';
import { venueStatusText } from '../../utils/venueText';

/** Pastille d'état de la salle, mise à jour chaque minute : « Ouvert jusqu'à 22:00 » (vert) ou « Fermé · rouvre demain à 07:00 ». */
export function VenueStatusBadge({ hours, compact }: { hours: DayHours[]; compact?: boolean }) {
  const { colors } = useTheme();
  const now = useNow();
  const status = venueStatus(hours, new Date(now));
  const open = status.kind === 'open';
  const bg = open ? colors.successSoft : colors.surface2;
  const ink = open ? colors.successInk : colors.muted;
  return (
    <View style={[styles.pill, { backgroundColor: bg }, compact && styles.compact]}>
      <View style={[styles.dot, { backgroundColor: open ? colors.success : colors.muted }]} />
      <Text style={[styles.text, { color: ink }]} numberOfLines={1}>{venueStatusText(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, height: 26, borderRadius: 13, maxWidth: '100%' },
  compact: { height: 22, paddingHorizontal: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontFamily: fonts.bodyBold, fontSize: 12, flexShrink: 1 },
});
