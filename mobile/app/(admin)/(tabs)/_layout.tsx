import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FloatingTabBar, type FloatingTabBarProps } from '../../../src/components/FloatingTabBar';

/** Barre d'onglets Admin v2 : Pilotage, Planning, Adhérents, Plus + bouton rond de scan QR. */
export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...(props as unknown as FloatingTabBarProps)} actionRoute="scanner" actionIcon="qr-code-scanner" />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pilotage',
          tabBarIcon: ({ color }) => <MaterialIcons name="dashboard" size={24} color={color as string} />,
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
        name="members"
        options={{
          title: 'Adhérents',
          tabBarIcon: ({ color }) => <MaterialIcons name="group" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color }) => <MaterialIcons name="grid-view" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen name="scanner" options={{ title: 'Scanner', tabBarLabel: () => null }} />
    </Tabs>
  );
}
