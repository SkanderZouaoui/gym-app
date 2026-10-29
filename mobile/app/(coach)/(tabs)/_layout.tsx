import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FloatingTabBar, type FloatingTabBarProps } from '../../../src/components/FloatingTabBar';

/** Barre d'onglets Coach v2 : Planning, Programmes, Profil. « Aujourd'hui » et « Élèves » restent
 * accessibles par navigation directe mais ne figurent plus dans la barre. Les écrans de détail
 * vivent au niveau parent (coach)/_layout.tsx (Stack) pour garder un vrai historique de navigation. */
/** L'onglet « Aujourd'hui » (index) est masqué : l'app s'ouvre sur le Planning. */
export const unstable_settings = { initialRouteName: 'planning' };

export default function CoachTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...(props as unknown as FloatingTabBarProps)} />}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-month" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programmes',
          tabBarIcon: ({ color }) => <MaterialIcons name="fitness-center" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen name="students" options={{ href: null }} />
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
