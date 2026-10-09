import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { IconCircleButton } from '../ui';

interface AppHeaderProps {
  hasUnreadNotification?: boolean;
  onPressNotifications?: () => void;
}

/** En-tête commun aux écrans racine Adhérent : logo + marque, cloche notifications.
 * Cf. FitZone App Adherent.dc.html, section B1. */
export function AppHeader({ hasUnreadNotification, onPressNotifications }: AppHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={styles.logoRow}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>MU</Text>
        </View>
        <Text style={styles.brand}>MuscleUP</Text>
      </View>
      <View style={styles.actions}>
        <IconCircleButton icon="notifications" onPress={onPressNotifications} badge={hasUnreadNotification} />
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logo: {
      width: 34, height: 34, borderRadius: radii.sm, backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    logoText: { fontFamily: fonts.head, color: colors.primaryContrast, fontSize: 12 },
    brand: { fontFamily: fonts.head, fontSize: 18, color: colors.text },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  });
}
