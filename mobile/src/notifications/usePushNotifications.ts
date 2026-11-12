import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '../store/session';
import { notificationTarget, type AppRole } from './targets';
import { clearBadge, configureForegroundNotifications, registerForPush } from './push';

configureForegroundNotifications();

const NOTIFICATIONS_ROUTE = {
  MEMBER: '/(member)/notifications',
  COACH: '/(coach)/notifications',
  STAFF: '/(staff)/notifications',
  ADMIN: '/(admin)/notifications',
} as const;

/** Enregistre l'appareil pour les push dès qu'un compte est connecté, rafraîchit la liste à la réception
 * et ouvre l'écran Notifications au toucher d'une notification. */
export function usePushNotifications() {
  const queryClient = useQueryClient();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const userId = useSessionStore((s) => s.user?.id);

  useEffect(() => {
    if (isAuthenticated && userId) void registerForPush();
  }, [isAuthenticated, userId]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    });
    const opened = Notifications.addNotificationResponseReceivedListener((response) => {
      const { isAuthenticated: ok, activeRole } = useSessionStore.getState();
      void clearBadge();
      if (!ok) return;
      const role = (activeRole ?? 'MEMBER') as AppRole;
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      // Au toucher d'un push : directement la page dédiée (cours, abonnement…) ; à défaut, l'écran Notifications.
      const target = typeof data.type === 'string' ? notificationTarget(data.type, data, role) : null;
      router.push((target?.kind === 'route' ? target.href : NOTIFICATIONS_ROUTE[role]) as never);
    });
    return () => {
      received.remove();
      opened.remove();
    };
  }, [queryClient]);
}
