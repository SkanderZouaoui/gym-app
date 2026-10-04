import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface FeedPost {
  id: string;
  body: string;
  imageKey: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; photoKey: string | null };
  _count: { comments: number; reactions: number };
}

export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: () => apiRequest<FeedPost[]>('/v1/feed'),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => apiRequest('/v1/posts', { method: 'POST', body: { body } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
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

export interface Conversation {
  id: string;
  participants: { user: { id: string; firstName: string; lastName: string; photoKey: string | null } }[];
  messages: { body: string; createdAt: string }[];
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiRequest<Conversation[]>('/v1/conversations'),
  });
}
