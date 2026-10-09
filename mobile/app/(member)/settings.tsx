import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme, type ThemePreference } from '../../src/theme/ThemeContext';
import { SegmentedControl } from '../../src/components/ui';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

export default function SettingsScreen() {
  const { colors, preference, setScheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Paramètres" fallbackHref="/(member)/(tabs)/profile" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Apparence</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Thème</Text>
          <SegmentedControl options={THEME_OPTIONS} value={preference} onChange={setScheme} />
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Notifications push</Text>
            <Switch value disabled trackColor={{ true: colors.primary }} />
          </View>
          <Text style={styles.rowHint}>Les préférences détaillées par type arrivent prochainement.</Text>
        </View>

        <Text style={styles.sectionTitle}>Langue</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Français</Text>
            <MaterialIcons name="check" size={20} color={colors.primaryInk} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Compte</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => router.navigate('/(member)/notifications')}>
            <Text style={styles.rowLabel}>Notifications reçues</Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} onPress={() => router.navigate('/(member)/app-info')}>
            <Text style={styles.rowLabel}>À propos</Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.row} onPress={() => router.navigate('/(member)/account-delete')}>
            <Text style={[styles.rowLabel, { color: colors.dangerInk }]}>Supprimer mon compte</Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.dangerInk} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
    sectionTitle: {
      fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted, textTransform: 'uppercase',
      letterSpacing: 0.4, marginTop: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 10,
    },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
    rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.text },
    rowHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    divider: { height: 1, backgroundColor: colors.border },
  });
}
