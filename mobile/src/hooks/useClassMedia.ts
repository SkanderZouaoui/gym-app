import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import { normalizeImageType, readUploadBlob } from '../utils/upload';

export interface PickedImage {
  uri: string;
  mimeType?: string | null;
}

function useRefreshClassTypes() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'class-types'] });
    void queryClient.invalidateQueries({ queryKey: ['classes'] });
  };
}

/** Envoie des photos dans la galerie d'un type de cours (admin) : stockage direct par URL présignée, puis ajout à la galerie.
 * Les photos sont envoyées une à une ; une échec n'interrompt pas les suivantes (`failed` les compte). */
export function useAddClassGalleryImages() {
  const refresh = useRefreshClassTypes();
  return useMutation({
    mutationFn: async ({ typeId, images }: { typeId: string; images: PickedImage[] }) => {
      let added = 0;
      let failed = 0;
      for (const image of images) {
        try {
          const contentType = normalizeImageType(image.mimeType);
          const blob = await readUploadBlob(image.uri);
          const { key, uploadUrl } = await apiRequest<{ key: string; uploadUrl: string }>(
            `/v1/admin/class-types/${typeId}/gallery/upload-url`,
            { method: 'POST', body: { contentType, sizeBytes: blob.size } },
          );
          const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
          if (!put.ok) throw new Error('UPLOAD_FAILED');
          await apiRequest(`/v1/admin/class-types/${typeId}/gallery`, { method: 'POST', body: { key } });
          added += 1;
        } catch {
          failed += 1;
        }
      }
      return { added, failed };
    },
    onSettled: refresh,
  });
}

export function useRemoveClassGalleryImage() {
  const refresh = useRefreshClassTypes();
  return useMutation({
    mutationFn: ({ typeId, key }: { typeId: string; key: string }) =>
      apiRequest(`/v1/admin/class-types/${typeId}/gallery`, { method: 'DELETE', body: { key } }),
    onSettled: refresh,
  });
}
