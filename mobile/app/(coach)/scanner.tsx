import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Scanner } from '../../src/components/Scanner';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useCoachSessions } from '../../src/hooks/useCoachSessions';

export default function CoachScannerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { data: sessions } = useCoachSessions();

  const now = Date.now();
  const currentSession =
    sessions?.find((s) => new Date(s.startsAt).getTime() <= now && new Date(s.endsAt).getTime() >= now) ??
    sessions?.[0];

  const [sessionId, setSessionId] = useState(params.sessionId ?? currentSession?.id);
  const activeSessionId = sessionId ?? currentSession?.id;

  if (!activeSessionId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun cours disponible à scanner.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const session = sessions?.find((s) => s.id === activeSessionId);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{session?.classType.name ?? 'Scanner'}</Text>
          {sessions && sessions.length > 1 ? (
            <View style={styles.selector}>
              {sessions.slice(0, 4).map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.pill, s.id === activeSessionId && styles.pillActive]}
                  onPress={() => setSessionId(s.id)}
                >
                  <Text style={[styles.pillText, s.id === activeSessionId && styles.pillTextActive]}>
                    {new Date(s.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </SafeAreaView>
      <Scanner sessionId={activeSessionId} />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    headerSafeArea: { backgroundColor: 'rgba(0,0,0,0.6)' },
    header: { padding: spacing.md, gap: spacing.sm },
    headerTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: '#fff' },
    selector: { flexDirection: 'row', gap: 6 },
    pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
    pillActive: { backgroundColor: colors.primary },
    pillText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: '#fff' },
    pillTextActive: { color: colors.primaryContrast },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontFamily: fonts.body, color: colors.muted },
  });
}
