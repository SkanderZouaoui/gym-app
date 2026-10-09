import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useConversationMessages, useConversations, useMarkConversationRead, useSendMessage } from '../../../src/hooks/useSocial';
import { useMe } from '../../../src/hooks/useMe';

/** Fil de conversation — FitZone App Coach.dc.html, N3. */
export default function CoachConversationScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user } = useMe();
  const { data: conversations } = useConversations();
  const { data: messages } = useConversationMessages(id);
  const sendMessage = useSendMessage(id);
  const markRead = useMarkConversationRead(id);
  const [draft, setDraft] = useState('');

  const conversation = conversations?.find((c) => c.id === id);
  const other = conversation?.participants.find((p) => p.user.id !== user?.id)?.user;

  useEffect(() => {
    if (id) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage.mutate(draft.trim(), { onSuccess: () => setDraft('') });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={other ? `${other.firstName} ${other.lastName}` : ''} fallbackHref="/(coach)/(tabs)/messages" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={messages ?? []}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            return (
              <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                </View>
              </View>
            );
          }}
        />
        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Écrire un message…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          <Pressable onPress={handleSend} style={styles.sendButton}>
            <MaterialIcons name="send" size={18} color={colors.primaryContrast} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    list: { padding: spacing.lg, gap: 8, flexDirection: 'column-reverse' },
    bubbleRow: { flexDirection: 'row' },
    bubbleRowMine: { justifyContent: 'flex-end' },
    bubbleRowTheirs: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '78%', borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
    bubbleText: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
    bubbleTextMine: { color: colors.primaryContrast },
    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: spacing.md,
      borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
    },
    input: {
      flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 999, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 16, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: colors.text,
    },
    sendButton: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
