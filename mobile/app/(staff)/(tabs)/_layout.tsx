import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FloatingTabBar, type FloatingTabBarProps } from '../../../src/components/FloatingTabBar';
import { useTranslation } from 'react-i18next';

/** L'espace staff s'ouvre sur l'écran d'accueil (chiffres du jour, raccourcis). */
export const unstable_settings = { initialRouteName: 'index' };

/** Barre d'onglets Accueil v2 : Accueil, Adhérents, Planning, Caisse, Profil + bouton rond de scan QR. */
export default function StaffTabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...(props as unknown as FloatingTabBarProps)} actionRoute="scanner" actionIcon="qr-code-scanner" />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('common.accueil'),
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: t('common.adherents'),
          tabBarIcon: ({ color }) => <MaterialIcons name="group" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: t('common.planning'),
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-month" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="cash"
        options={{
          title: t('staff.caisse'),
          tabBarIcon: ({ color }) => <MaterialIcons name="point-of-sale" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('common.profil'),
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen name="scanner" options={{ title: t('common.scanner'), tabBarLabel: () => null }} />
    </Tabs>
  );
}
