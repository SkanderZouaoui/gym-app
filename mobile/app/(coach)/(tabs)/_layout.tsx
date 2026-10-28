import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';

/** Barre d'onglets Coach — cf. Design System/FZ CoachTabBar.dc.html :
 * 4 onglets plats ÉGAUX, PAS de bouton surélevé (contrairement à l'Adhérent/Staff/Admin).
 * Les écrans de détail vivent au niveau parent (coach)/_layout.tsx (Stack) pour garder
 * un vrai historique de navigation (bouton retour + swipe iOS). */
export default function CoachTabsLayout() {
  const { colors } = useTheme();

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
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
