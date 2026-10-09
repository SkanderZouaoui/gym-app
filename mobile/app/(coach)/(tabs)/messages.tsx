import { useMemo } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useConversations } from '../../../src/hooks/useSocial';
import { useMe } from '../../../src/hooks/useMe';
import { Avatar, EmptyState } from '../../../src/components/ui';

/** Messagerie Coach — liste des conversations. FitZone App Coach.dc.html, N3. */
export default function CoachMessagesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const { data: conversations } = useConversations();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <FlatList
        data={conversations ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const other = item.participants.find((p) => p.user.id !== user?.id)?.user;
          const last = item.messages[0];
          const unread = last && last.senderId !== user?.id && !last.readAt;
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/(coach)/conversation/${item.id}`)}>
              <Avatar initials={`${other?.firstName[0] ?? '?'}${other?.lastName[0] ?? ''}`.toUpperCase()} background={colors.accentSoft} color={colors.accentInk} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, unread && styles.nameUnread]}>{other?.firstName} {other?.lastName}</Text>
                {last ? <Text style={styles.preview} numberOfLines={1}>{last.body}</Text> : null}
              </View>
              {unread ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="forum" title="Aucune conversation" text="Écrivez à un élève depuis sa fiche." tone="primary" />
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { padding: spacing.lg, paddingBottom: spacing.sm },
    title: { fontFamily: fonts.head, fontSize: 24, color: colors.text },
    list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
      borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    nameUnread: { fontFamily: fonts.bodyBold },
    preview: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  });
}
