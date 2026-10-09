import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type TrainingTab = 'programs' | 'history' | 'progress';

const TABS: { value: TrainingTab; label: string }[] = [
  { value: 'programs', label: 'Programmes' },
  { value: 'history', label: 'Historique' },
  { value: 'progress', label: 'Progression' },
];

/** Tabs internes partagés entre Mes programmes, Historique et Progression —
 * FitZone App Entraînement.dc.html (D1/E1/F1). Soulignement orange sur l'actif. */
export function TrainingTabs({ value, onChange }: { value: TrainingTab; onChange: (tab: TrainingTab) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable key={tab.value} style={styles.tab} onPress={() => onChange(tab.value)}>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            <View style={[styles.underline, active && styles.underlineActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 20 },
    tab: { gap: 8 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted },
    labelActive: { color: colors.primaryInk, fontFamily: fonts.bodyBold },
    underline: { height: 2.5, borderRadius: 2, backgroundColor: 'transparent' },
    underlineActive: { backgroundColor: colors.primary },
  });
}
