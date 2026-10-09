import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { fonts } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';

/** Barre d'onglets Adhérent — cf. Design System/FZ TabBar.dc.html : 5 cols,
 * bouton QR central surélevé (60px, sans libellé), icône active en FILL 1 / primaryInk.
 * Les écrans de détail vivent au niveau parent (member)/_layout.tsx (Stack) pour
 * garder un vrai historique de navigation (bouton retour + swipe iOS). */
export default function MemberTabsLayout() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => <MaterialIcons name="home" size={24} color={color} style={{ opacity: focused ? 1 : 0.9 }} />,
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
      <Tabs.Screen
        name="training"
        options={{
          title: 'Entraînement',
          tabBarIcon: ({ color }) => <MaterialIcons name="fitness-center" size={24} color={color} />,
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
