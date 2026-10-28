import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type TrainingTab = 'programs' | 'history' | 'exercises';

const TABS: { value: TrainingTab; label: string }[] = [
  { value: 'programs', label: 'Mes programmes' },
  { value: 'history', label: 'Historique' },
  { value: 'exercises', label: 'Exercices' },
];

/** Segments de l'onglet Entraînement (v2) : pastilles défilantes, l'active en dégradé d'accent. */
export function TrainingTabs({ value, onChange }: { value: TrainingTab; onChange: (tab: TrainingTab) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable key={tab.value} style={styles.tab} onPress={() => onChange(tab.value)}>
            {active ? (
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { gap: 8 },
    tab: {
      height: 36, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    labelActive: { color: colors.primaryContrast },
  });
}
