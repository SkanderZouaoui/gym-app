import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar, Pill } from '../ui';

interface RosterRowProps {
  firstName: string;
  lastName: string;
  attended: boolean;
  waitlistPosition: number | null;
  onCheckIn: () => void;
  checkingIn?: boolean;
}

/** Ligne de la liste d'appel — FitZone App Coach.dc.html, I3. */
export function RosterRow({ firstName, lastName, attended, waitlistPosition, onCheckIn, checkingIn }: RosterRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Avatar initials={`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{firstName} {lastName}</Text>
        {waitlistPosition ? <Text style={styles.waitlist}>Liste d’attente · {waitlistPosition}e</Text> : null}
      </View>
      {attended ? (
        <Pill label="Présent" tone="success" />
      ) : (
        <Pressable onPress={onCheckIn} disabled={checkingIn} style={styles.checkButton}>
          <MaterialIcons name="check" size={18} color={colors.successInk} />
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    waitlist: { fontFamily: fonts.body, fontSize: 11.5, color: colors.warningInk },
    checkButton: {
      width: 34, height: 34, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.successSoft,
      backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center',
    },
  });
}
