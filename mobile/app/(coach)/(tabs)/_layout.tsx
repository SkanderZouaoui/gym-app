import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FloatingTabBar, type FloatingTabBarProps } from '../../../src/components/FloatingTabBar';
import { useTranslation } from 'react-i18next';

/** Barre d'onglets Coach v2 : Accueil, Planning, Programmes, Profil + bouton rond de scan QR. « Élèves » reste
 * accessible par navigation directe mais ne figure plus dans la barre. Les écrans de détail
 * vivent au niveau parent (coach)/_layout.tsx (Stack) pour garder un vrai historique de navigation. */
/** L'espace coach s'ouvre sur l'Accueil (prochain cours, à traiter, cours du jour). */
export const unstable_settings = { initialRouteName: 'index' };

export default function CoachTabsLayout() {
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
        name="planning"
        options={{
          title: t('common.planning'),
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-month" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: t('common.programmes'),
          tabBarIcon: ({ color }) => <MaterialIcons name="fitness-center" size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen name="students" options={{ href: null }} />
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
