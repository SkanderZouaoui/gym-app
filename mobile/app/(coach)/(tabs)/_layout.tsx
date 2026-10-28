import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FloatingTabBar, type FloatingTabBarProps } from '../../../src/components/FloatingTabBar';

/** Barre d'onglets Coach — cf. Design System/FZ CoachTabBar.dc.html :
 * 4 onglets plats ÉGAUX, PAS de bouton surélevé (contrairement à l'Adhérent/Staff/Admin).
 * Les écrans de détail vivent au niveau parent (coach)/_layout.tsx (Stack) pour garder
 * un vrai historique de navigation (bouton retour + swipe iOS). */
export default function CoachTabsLayout() {

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <FloatingTabBar {...(props as unknown as FloatingTabBarProps)} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Aujourd'hui",
          tabBarIcon: ({ color }) => <MaterialIcons name="today" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-month" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Élèves',
          tabBarIcon: ({ color }) => <MaterialIcons name="group" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
