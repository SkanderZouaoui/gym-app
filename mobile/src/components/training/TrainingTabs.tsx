import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { HScroll } from '../ui/HScroll';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

export type TrainingTab = 'proposed' | 'programs' | 'history' | 'exercises';

const TABS: { value: TrainingTab; label: string }[] = [
  { value: 'proposed', get label() { return i18n.t('member.proposes'); } },
  { value: 'programs', get label() { return i18n.t('member.mes_programmes'); } },
  { value: 'history', get label() { return i18n.t('member.historique'); } },
  { value: 'exercises', get label() { return i18n.t('common.exercices'); } },
];

/** Segments de l'onglet Entraînement (v2) : pastilles défilantes, l'active en dégradé d'accent. */
export function TrainingTabs({ value, onChange }: { value: TrainingTab; onChange: (tab: TrainingTab) => void }) {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <HScroll contentContainerStyle={styles.row}>
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
    </HScroll>
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
