import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { fonts } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useRemoteConfig } from '../../../src/config/RemoteConfigContext';
import type { TabId } from '@muscleup/shared';

const ICONS: Record<TabId, keyof typeof MaterialIcons.glyphMap> = {
  home: 'home',
  planning: 'calendar-month',
  training: 'fitness-center',
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
  const { colors } = useTheme();
  const { config } = useRemoteConfig();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const orderedTabs = config.tabs.filter((t) => t.on || t.id !== 'planning');
  const midIndex = Math.ceil(orderedTabs.length / 2);
  const before = orderedTabs.slice(0, midIndex);
  const after = orderedTabs.slice(midIndex);

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
      {before.map((tab) => (
        <Tabs.Screen
          key={tab.id}
          name={tab.id === 'home' ? 'index' : tab.id}
          options={{
            title: tab.fr,
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons name={ICONS[tab.id]} size={24} color={color} style={{ opacity: focused ? 1 : 0.9 }} />
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="qr"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.centerButton, focused && styles.centerButtonActive]}>
              <MaterialIcons name="qr-code-2" size={28} color={colors.primaryContrast} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      {after.map((tab) => (
        <Tabs.Screen
          key={tab.id}
          name={tab.id === 'home' ? 'index' : tab.id}
          options={{
            title: tab.fr,
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons name={ICONS[tab.id]} size={24} color={color} style={{ opacity: focused ? 1 : 0.9 }} />
            ),
          }}
        />
      ))}
      {!orderedTabs.some((t) => t.id === 'planning') ? (
        <Tabs.Screen name="planning" options={{ href: null }} />
      ) : null}
    </Tabs>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    centerButton: {
      width: 60,
      height: 60,
      borderRadius: 999,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -26,
      borderWidth: 4,
      borderColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    centerButtonActive: { backgroundColor: colors.primaryPressed },
  });
}
