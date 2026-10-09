import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { fonts } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useConversations } from '../../../src/hooks/useSocial';
import { useMe } from '../../../src/hooks/useMe';

/** Barre d'onglets Coach — cf. Design System/FZ CoachTabBar.dc.html :
 * 5 onglets plats ÉGAUX, PAS de bouton surélevé (contrairement à l'Adhérent/Staff/Admin).
 * Badge de messages non lus sur l'onglet Messages. Les écrans de détail vivent au
 * niveau parent (coach)/_layout.tsx (Stack) pour garder un vrai historique de
 * navigation (bouton retour + swipe iOS). */
export default function CoachTabsLayout() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const { data: conversations } = useConversations();
  const unreadCount =
    conversations?.filter((c) => {
      const last = c.messages[0];
      return last && last.senderId !== user?.id && !last.readAt;
    }).length ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryInk,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 10.5 },
        tabBarStyle: {
          height: 88, paddingTop: 8, paddingBottom: 22,
          backgroundColor: colors.surface, borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Aujourd'hui",
          tabBarIcon: ({ color }) => <MaterialIcons name="today" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-month" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Élèves',
          tabBarIcon: ({ color }) => <MaterialIcons name="group" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <View>
              <MaterialIcons name="chat" size={24} color={color} />
              {unreadCount > 0 ? <View style={styles.badge} /> : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    badge: {
      position: 'absolute', top: -2, right: -6, width: 10, height: 10, borderRadius: 5,
      backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface,
    },
  });
}
