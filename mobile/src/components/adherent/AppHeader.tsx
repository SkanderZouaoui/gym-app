import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { IconCircleButton } from '../ui';

interface AppHeaderProps {
  siteName?: string;
  hasUnreadNotification?: boolean;
  onPressNotifications?: () => void;
  onPressSite?: () => void;
}

/** En-tête commun aux écrans racine Adhérent : logo + marque, pilule site, cloche notifications.
 * Cf. FitZone App Adherent.dc.html, section B1. */
export function AppHeader({ siteName, hasUnreadNotification, onPressNotifications, onPressSite }: AppHeaderProps) {
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
        {siteName ? (
          <Pressable style={styles.sitePill} onPress={onPressSite}>
            <MaterialIcons name="location-on" size={15} color={colors.text} />
            <Text style={styles.siteText}>{siteName}</Text>
            <MaterialIcons name="expand-more" size={15} color={colors.muted} />
          </Pressable>
        ) : null}
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
    sitePill: {
      flexDirection: 'row', alignItems: 'center', gap: 2, height: 38, paddingHorizontal: 10,
      borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    },
    siteText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.text },
  });
}
