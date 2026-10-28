import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FloatingTabBar, type FloatingTabBarProps } from '../../src/components/FloatingTabBar';

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <FloatingTabBar {...(props as unknown as FloatingTabBarProps)} actionRoute="scanner" actionIcon="qr-code-scanner" />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ color }) => <MaterialIcons name="dashboard" size={22} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={22} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: '',
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Adhérents',
          tabBarIcon: ({ color }) => <MaterialIcons name="people" size={22} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color }) => <MaterialIcons name="menu" size={22} color={color as string} />,
        }}
      />
    </Tabs>
  );
}

