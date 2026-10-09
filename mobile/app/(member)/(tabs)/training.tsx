import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { TrainingTabs, type TrainingTab } from '../../../src/components/training/TrainingTabs';
import { ProgramsView } from '../../../src/components/training/views/ProgramsView';
import { HistoryView } from '../../../src/components/training/views/HistoryView';
import { ProgressView } from '../../../src/components/training/views/ProgressView';

/** Onglet Entraînement — FitZone App Entraînement.dc.html (D1/E1/F1). */
export default function TrainingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<TrainingTab>('programs');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Entraînement</Text>
          {tab === 'progress' ? (
            <Pressable style={styles.measureButton} onPress={() => router.push('/(member)/measure')}>
              <MaterialIcons name="add" size={18} color={colors.primaryContrast} />
              <Text style={styles.measureButtonText}>Mesure</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.measureButton} onPress={() => router.push('/(member)/exercises')}>
              <MaterialIcons name="menu-book" size={18} color={colors.primaryContrast} />
              <Text style={styles.measureButtonText}>Bibliothèque</Text>
            </Pressable>
          )}
        </View>

        <TrainingTabs value={tab} onChange={setTab} />

        {tab === 'programs' ? <ProgramsView /> : tab === 'history' ? <HistoryView /> : <ProgressView />}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontFamily: fonts.head, fontSize: 28, color: colors.text },
    measureButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
      borderRadius: 999, backgroundColor: colors.primary,
    },
    measureButtonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryContrast },
  });
}
