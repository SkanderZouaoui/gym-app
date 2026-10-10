import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appConfigApi, type PatchAppConfigInput } from '../api/endpoints'

/**
 * Brouillon de configuration de l'app mobile (branding, accueil, navigation,
 * textes, notifications, règles). Toute page "Application" lit `draft` et
 * appelle `patch(section, value, changeLabel)` pour modifier une section —
 * le serveur fusionne et renvoie le brouillon à jour, `changedKeys` pilote
 * le badge "modification(s) en attente" du layout.
 */
export function useAppConfigDraft() {
  const queryClient = useQueryClient()

  const { data: draft, isLoading } = useQuery({
    queryKey: ['app-config', 'draft'],
    queryFn: appConfigApi.getDraft,
  })

  const patchMutation = useMutation({
    mutationFn: (input: PatchAppConfigInput) => appConfigApi.patchDraft(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['app-config', 'draft'], updated)
    },
  })

  function patch(input: PatchAppConfigInput) {
    patchMutation.mutate(input)
  }

  return {
    draft,
    isLoading,
    patch,
    isSaving: patchMutation.isPending,
    changeCount: draft?.changedKeys.length ?? 0,
  }
}
