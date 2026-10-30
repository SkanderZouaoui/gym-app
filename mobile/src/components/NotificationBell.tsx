import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useNotifications } from '../hooks/useProfile';

/** Cloche de notifications des en-têtes d'accueil (tous les rôles) : pastille ronde avec compteur de non lus. */
export function NotificationBell({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => !n.readAt).length;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}
    >
      <MaterialIcons name="notifications-none" size={24} color={colors.primaryInk} />
      {unread > 0 ? (
        <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: '#fff' }}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
