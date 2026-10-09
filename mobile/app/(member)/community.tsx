import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import {
  useConversations,
  useCreatePost,
  useFeed,
  useReportPost,
  useToggleReaction,
} from '../../src/hooks/useSocial';
import { Avatar, EmptyState, SegmentedControl } from '../../src/components/ui';
import { PostCard } from '../../src/components/adherent/PostCard';

export default function CommunityScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<'feed' | 'messages'>('feed');
  const { data: posts } = useFeed();
  const { data: conversations } = useConversations();
  const createPost = useCreatePost();
  const toggleReaction = useToggleReaction();
  const reportPost = useReportPost();
  const [draft, setDraft] = useState('');

  const handlePost = () => {
    if (!draft.trim()) return;
    createPost.mutate({ body: draft.trim() }, { onSuccess: () => setDraft('') });
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
      <View style={styles.tabWrap}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'feed', label: "Fil d'actualité" },
            { value: 'messages', label: 'Messages' },
          ]}
        />
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
                placeholder="Partagez une séance, un record ou une question..."
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
            <PostCard
              authorName={`${item.author.firstName} ${item.author.lastName}`}
              authorInitial={item.author.firstName[0]}
              authorPhotoUrl={item.author.photoUrl}
              createdAt={item.createdAt}
              body={item.body}
              imageUrl={item.imageUrl}
              likeCount={item._count.reactions}
              commentCount={item._count.comments}
              onReact={() => toggleReaction.mutate(item.id)}
              onReport={() => handleReport(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="forum"
              title="Le fil est calme"
              text="Partagez une séance, un record ou une question à la communauté."
              tone="primary"
            />
          }
        />
      ) : (
        <FlatList
          data={conversations ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const lastMessage = item.messages[0];
            return (
              <View style={styles.card}>
                <Avatar initials={item.participants[0]?.user.firstName[0] ?? '?'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.coachName}>
                    {item.participants.map((p) => p.user.firstName).join(', ')}
                  </Text>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {lastMessage?.body ?? 'Aucun message'}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState icon="chat" title="Aucune conversation" text="Écrivez à votre coach ou à l'accueil de la salle." tone="primary" />
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    tabWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
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
      padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    coachName: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.text },
    lastMessage: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  });
}
