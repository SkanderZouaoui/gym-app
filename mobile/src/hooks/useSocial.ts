import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface FeedPost {
  id: string;
  body: string;
  imageKey: string | null;
  imageUrl: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; photoKey: string | null; photoUrl: string | null };
  _count: { comments: number; reactions: number };
}

export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: () => apiRequest<FeedPost[]>('/v1/feed'),
  });
}

export interface CreatePostInput {
  body: string;
  imageKey?: string;
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => apiRequest('/v1/posts', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

/** Envoie une photo (ex. après une séance) directement vers le stockage
 * objet via une URL présignée, renvoie la clé à joindre à la publication. */
export function useUploadPostPhoto() {
  return useMutation({
    mutationFn: async ({ uri, contentType }: { uri: string; contentType: string }) => {
      const { key, uploadUrl } = await apiRequest<{ key: string; uploadUrl: string }>('/v1/me/photos/post-upload-url', {
        method: 'POST',
        body: { contentType },
      });
      const blob = await (await fetch(uri)).blob();
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error('UPLOAD_FAILED');
      return { key };
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiRequest(`/v1/posts/${postId}/reactions`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useReportPost() {
  return useMutation({
    mutationFn: (payload: { targetId: string; reason: string }) =>
      apiRequest('/v1/reports', {
        method: 'POST',
        body: { targetType: 'POST', targetId: payload.targetId, reason: payload.reason },
      }),
  });
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface Conversation {
  id: string;
  participants: { user: { id: string; firstName: string; lastName: string; photoKey: string | null } }[];
  messages: ConversationMessage[];
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiRequest<Conversation[]>('/v1/conversations'),
  });
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: () => apiRequest<ConversationMessage[]>(`/v1/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}

export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiRequest<ConversationMessage>(`/v1/conversations/${conversationId}/messages`, { method: 'POST', body: { body } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkConversationRead(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest(`/v1/conversations/${conversationId}/read`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: string) =>
      apiRequest<Conversation>('/v1/conversations', { method: 'POST', body: { otherUserId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
