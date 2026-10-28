import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar, IconCircleButton } from '../ui';

interface AppHeaderProps {
  /** Petite ligne au-dessus du prénom ("Bonjour,"). */
  greeting: string;
  firstName?: string;
  lastName?: string;
  hasUnreadNotification?: boolean;
  onPressNotifications?: () => void;
}

/** En-tête de l'Accueil adhérent v2 : avatar à initiales, salutation, cloche.
 * Cf. Design System/FitZone Mobile Adherent.dc.html, écran Accueil. */
export function AppHeader({ greeting, firstName, lastName, hasUnreadNotification, onPressNotifications }: AppHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'MU';
  return (
    <View style={styles.row}>
      <Avatar initials={initials} size={44} background={colors.primarySoft} color={colors.primaryInk} />
      <View style={styles.text}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.name} numberOfLines={1}>{firstName ?? ''}</Text>
      </View>
      <IconCircleButton icon="notifications-none" radius={14} badgeColor={colors.primary} onPress={onPressNotifications} badge={hasUnreadNotification} />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6, paddingBottom: 6 },
    text: { flex: 1 },
    greeting: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    name: { ...typography.title, fontSize: 21, color: colors.text },
  });
}

