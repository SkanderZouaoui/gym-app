import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { FloatingTabBar, type FloatingTabBarProps } from '../../../src/components/FloatingTabBar';
import { useRemoteConfig } from '../../../src/config/RemoteConfigContext';
import { DEFAULT_TABS, type TabId } from '@muscleup/shared';

const ICONS: Record<TabId, keyof typeof MaterialIcons.glyphMap> = {
  home: 'home',
  planning: 'calendar-month',
  training: 'fitness-center',
  progress: 'show-chart',
  profile: 'person',
};

/** Barre d'onglets Adhérent — cf. Design System/FZ TabBar.dc.html : jusqu'à
 * 5 cols, bouton QR central surélevé (60px, sans libellé, toujours affiché),
 * icône active en FILL 1 / primaryInk. L'ordre, les libellés (FR/AR) et la
 * visibilité de "planning" sont pilotés par la configuration publiée
 * (back-office → Navigation). home/training/profile restent toujours actifs.
 * Les écrans de détail vivent au niveau parent (member)/_layout.tsx (Stack)
 * pour garder un vrai historique de navigation (bouton retour + swipe iOS). */
export default function MemberTabsLayout() {
  const { config } = useRemoteConfig();

  // Une configuration publiée avant l'ajout de « Progrès » n'a pas cet onglet : on l'insère
  // après « Entraînement » pour qu'il apparaisse sans republier depuis le back-office.
  const published = config.tabs.some((t) => t.id === 'progress')
    ? config.tabs
    : config.tabs.flatMap((t) =>
        t.id === 'training' ? [t, DEFAULT_TABS.find((d) => d.id === 'progress')!] : [t],
      );
  const orderedTabs = published.filter((t) => t.on || (t.id !== 'planning' && t.id !== 'progress'));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <FloatingTabBar {...(props as unknown as FloatingTabBarProps)} actionRoute="qr" actionIcon="qr-code-2" />}
    >
      {orderedTabs.map((tab) => (
        <Tabs.Screen
          key={tab.id}
          name={tab.id === 'home' ? 'index' : tab.id}
          options={{
            title: tab.fr,
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons name={ICONS[tab.id]} size={24} color={color as string} style={{ opacity: focused ? 1 : 0.9 }} />
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="qr"
        options={{
          title: '',
          tabBarLabel: () => null,
        }}
      />
      {!orderedTabs.some((t) => t.id === 'planning') ? (
        <Tabs.Screen name="planning" options={{ href: null }} />
      ) : null}
      {!orderedTabs.some((t) => t.id === 'progress') ? (
        <Tabs.Screen name="progress" options={{ href: null }} />
      ) : null}
    </Tabs>
  );
}

