import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import { usePreferencesStore } from '../store/preferences';

interface ServerPrefs {
  expiryAlert: boolean;
  classReminder: boolean;
}

/** « Alerte d'expiration » et « Rappels de cours » : la valeur du serveur fait foi (c'est lui qui envoie les rappels),
 * le store local sert de cache pour un affichage immédiat, même hors ligne. */
export function useNotificationPrefs() {
  const prefs = usePreferencesStore();
  const { data } = useQuery({ queryKey: ['me', 'notification-preferences'], queryFn: () => apiRequest<ServerPrefs>('/v1/me/notification-preferences') });

  useEffect(() => {
    if (!data) return;
    if (data.expiryAlert !== prefs.expiryAlert || data.classReminder !== prefs.classReminder) {
      prefs.set({ expiryAlert: data.expiryAlert, classReminder: data.classReminder });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const save = useMutation({
    mutationKey: ['notificationPrefs'],
    mutationFn: (patch: Partial<ServerPrefs>) => apiRequest<ServerPrefs>('/v1/me/notification-preferences', { method: 'PUT', body: patch }),
  });

  return {
    expiryAlert: prefs.expiryAlert,
    classReminder: prefs.classReminder,
    setPref: (patch: Partial<ServerPrefs>) => {
      prefs.set(patch);
      save.mutate(patch);
    },
  };
}
