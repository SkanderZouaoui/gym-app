import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Scanner } from '../../src/components/Scanner';
import { fonts, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMe } from '../../src/hooks/useMe';
import { useStaffToday } from '../../src/hooks/useStaff';

export default function StaffScannerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { data: user } = useMe();
  const { data } = useStaffToday(user?.homeBranchId ?? undefined);
  const [sessionId, setSessionId] = useState(params.sessionId);

  const activeSessionId = sessionId ?? data?.sessions[0]?.id;
  const session = data?.sessions.find((s) => s.id === activeSessionId);

  if (!activeSessionId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun cours aujourd’hui à scanner.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{session?.classTypeName ?? 'Scanner'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.selector}>
              {data?.sessions.map((s) => (
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
          </ScrollView>
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
