import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FloatingTabBar, type FloatingTabBarProps } from '../../../src/components/FloatingTabBar';

/** L'accueil s'ouvre sur la liste des adhérents ; « Aujourd'hui » reste accessible mais n'est plus dans la barre. */
export const unstable_settings = { initialRouteName: 'members' };

/** Barre d'onglets Accueil v2 : Adhérents, Planning, Caisse, Profil + bouton rond de scan QR. */
export default function StaffTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...(props as unknown as FloatingTabBarProps)} actionRoute="scanner" actionIcon="qr-code-scanner" />}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Adhérents',
          tabBarIcon: ({ color }) => <MaterialIcons name="group" size={24} color={color as string} />,
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
        name="cash"
        options={{
          title: 'Caisse',
          tabBarIcon: ({ color }) => <MaterialIcons name="point-of-sale" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen name="scanner" options={{ title: 'Scanner', tabBarLabel: () => null }} />
    </Tabs>
  );
}
