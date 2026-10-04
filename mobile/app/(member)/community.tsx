import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import {
  useConversations,
  useCreatePost,
  useFeed,
  useReportPost,
  useToggleReaction,
  type FeedPost,
} from '../../src/hooks/useSocial';

export default function CommunityScreen() {
  const [tab, setTab] = useState<'feed' | 'messages'>('feed');
  const { data: posts } = useFeed();
  const { data: conversations } = useConversations();
  const createPost = useCreatePost();
  const toggleReaction = useToggleReaction();
  const reportPost = useReportPost();
  const [draft, setDraft] = useState('');

  const handlePost = () => {
    if (!draft.trim()) return;
    createPost.mutate(draft.trim(), { onSuccess: () => setDraft('') });
  };

  const handleReport = (postId: string) => {
    Alert.alert('Signaler ce post', 'Confirmer le signalement de ce contenu ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Signaler',
        style: 'destructive',
        onPress: () => reportPost.mutate({ targetId: postId, reason: 'Signalé depuis le fil' }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Communauté" />
      <View style={styles.tabRow}>
        <Pressable style={[styles.tabButton, tab === 'feed' && styles.tabButtonActive]} onPress={() => setTab('feed')}>
          <Text style={[styles.tabText, tab === 'feed' && styles.tabTextActive]}>Fil d'actualité</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === 'messages' && styles.tabButtonActive]}
          onPress={() => setTab('messages')}
        >
          <Text style={[styles.tabText, tab === 'messages' && styles.tabTextActive]}>Messages</Text>
        </Pressable>
      </View>

      {tab === 'feed' ? (
        <FlatList
          data={posts ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Partage quelque chose avec la communauté..."
                placeholderTextColor={colors.muted}
                style={styles.composerInput}
                multiline
              />
              <Pressable onPress={handlePost} style={styles.composerButton}>
                <Text style={styles.composerButtonText}>Publier</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <PostCard post={item} onReact={() => toggleReaction.mutate(item.id)} onReport={() => handleReport(item.id)} />
          )}
          ListEmptyComponent={<Text style={styles.empty}>Aucune publication pour l'instant.</Text>}
        />
      ) : (
        <FlatList
          data={conversations ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const lastMessage = item.messages[0]
            return (
              <View style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.participants[0]?.user.firstName[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coachName}>
                    {item.participants.map((p) => p.user.firstName).join(', ')}
                  </Text>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {lastMessage?.body ?? 'Aucun message'}
                  </Text>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={<Text style={styles.empty}>Aucune conversation.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

function PostCard({ post, onReact, onReport }: { post: FeedPost; onReact: () => void; onReport: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.postHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.author.firstName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.coachName}>
            {post.author.firstName} {post.author.lastName}
          </Text>
          <Text style={styles.postDate}>{new Date(post.createdAt).toLocaleDateString('fr-FR')}</Text>
        </View>
        <Pressable onPress={onReport} hitSlop={8}>
          <MaterialIcons name="flag" size={18} color={colors.muted} />
        </Pressable>
      </View>
      <Text style={styles.postBody}>{post.body}</Text>
      <View style={styles.postFooter}>
        <Pressable onPress={onReact} style={styles.reactionButton}>
          <MaterialIcons name="favorite-border" size={18} color={colors.primaryInk} />
          <Text style={styles.reactionCount}>{post._count.reactions}</Text>
        </Pressable>
        <View style={styles.reactionButton}>
          <MaterialIcons name="chat-bubble-outline" size={18} color={colors.muted} />
          <Text style={styles.reactionCount}>{post._count.comments}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: 8, marginBottom: spacing.sm },
  tabButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface2 },
  tabButtonActive: { backgroundColor: colors.primarySoft },
  tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
  tabTextActive: { color: colors.primaryInk },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  composer: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm,
  },
  composerInput: { fontFamily: fonts.body, fontSize: 14, color: colors.text, minHeight: 60 },
  composerButton: {
    alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: radii.xs,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  composerButtonText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryContrast },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 10,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 999, backgroundColor: colors.secondarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.headBold, color: colors.secondaryInk, fontSize: 13 },
  coachName: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.text },
  postDate: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
  postBody: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 20 },
  postFooter: { flexDirection: 'row', gap: 16 },
  reactionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactionCount: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.muted },
  lastMessage: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  empty: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 40 },
});
