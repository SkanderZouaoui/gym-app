import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Scanner, type ScanSessionOption } from './Scanner';
import { ScreenTitle } from './ui';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

interface ScannerScreenProps {
  /** Cours scannables aujourd'hui ; undefined tant qu'ils chargent. */
  sessions: ScanSessionOption[] | undefined;
  /** Cours à présélectionner (paramètre de navigation). */
  initialSessionId?: string;
  emptyText: string;
}

/** Écran de scan commun (accueil, admin, coach) : choisit le cours actif puis affiche le scanner v2. */
export function ScannerScreen({ sessions, initialSessionId, emptyText }: ScannerScreenProps) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selected, setSelected] = useState<string | undefined>(initialSessionId);

  const now = Date.now();
  // Les cours terminés ne sont plus scannables : seuls restent le cours en cours et ceux à venir.
  const sorted = (sessions ?? [])
    .filter((s) => new Date(s.endsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const current = [...sorted].reverse().find((s) => new Date(s.startsAt).getTime() <= now) ?? sorted[0];
  // Un cours déjà choisi mais terminé entre-temps n'est plus valable.
  const activeId = selected && sorted.some((x) => x.id === selected) ? selected : current?.id;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {activeId ? (
        <Scanner sessionId={activeId} sessions={sorted} onSelectSession={setSelected} />
      ) : (
        <View style={styles.container}>
          <ScreenTitle title="Scanner" subtitle="Valider la présence aux cours collectifs." />
          <View style={[styles.empty, cardShadow]}>
            <MaterialIcons name="event-busy" size={36} color={colors.primaryInk} />
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md },
    empty: { padding: 32, alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted, textAlign: 'center' },
  });
}
