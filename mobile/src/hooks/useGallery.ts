import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import { normalizeImageType, readUploadBlob } from '../utils/upload';

export interface PickedImage {
  uri: string;
  mimeType?: string | null;
}

/** Galeries gérées par l'admin : photos d'un type de cours ou d'une salle. */
export type GalleryKind = 'class-types' | 'rooms';

const LIST_KEY: Record<GalleryKind, string[]> = {
  'class-types': ['admin', 'class-types'],
  rooms: ['admin', 'rooms'],
};

interface WithGallery {
  id: string;
  galleryKeys: string[];
  galleryUrls: string[];
}

/** Même liste, photos de `ownerId` remises dans l'ordre `keys` (URLs signées suivies). */
function applyOrder<T extends WithGallery>(list: T[] | undefined, ownerId: string, keys: string[]): T[] | undefined {
  return list?.map((item) => {
    if (item.id !== ownerId) return item;
    const urlByKey = new Map(item.galleryKeys.map((k, i) => [k, item.galleryUrls[i]]));
    return { ...item, galleryKeys: keys, galleryUrls: keys.map((k) => urlByKey.get(k) ?? '') };
  });
}

/**
 * Ajout (multiple), suppression et réordonnancement des photos d'un type de cours ou d'une salle.
 * Les photos sont envoyées une à une directement au stockage (URL présignée) puis rattachées ; un échec n'interrompt
 * pas les suivantes. Le réordonnancement s'affiche tout de suite (mise à jour optimiste) puis se confirme côté API.
 */
export function useGalleryMutations(kind: GalleryKind, ownerId: string) {
  const queryClient = useQueryClient();
  const base = `/v1/admin/${kind}/${ownerId}`;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: LIST_KEY[kind] });
    void queryClient.invalidateQueries({ queryKey: ['classes'] });
  };

  const add = useMutation({
    mutationFn: async (images: PickedImage[]) => {
      let added = 0;
      let failed = 0;
      for (const image of images) {
        try {
          const contentType = normalizeImageType(image.mimeType);
          const blob = await readUploadBlob(image.uri);
          const { key, uploadUrl } = await apiRequest<{ key: string; uploadUrl: string }>(`${base}/gallery/upload-url`, {
            method: 'POST',
            body: { contentType, sizeBytes: blob.size },
          });
          const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
          if (!put.ok) throw new Error('UPLOAD_FAILED');
          await apiRequest(`${base}/gallery`, { method: 'POST', body: { key } });
          added += 1;
        } catch {
          failed += 1;
        }
      }
      return { added, failed };
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (key: string) => apiRequest(`${base}/gallery`, { method: 'DELETE', body: { key } }),
    onSettled: refresh,
  });

  const reorder = useMutation({
    mutationFn: (keys: string[]) => apiRequest(`${base}/gallery/order`, { method: 'PUT', body: { keys } }),
    onMutate: async (keys) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY[kind] });
      queryClient.setQueryData<WithGallery[]>(LIST_KEY[kind], (list) => applyOrder(list, ownerId, keys));
    },
    onSettled: refresh,
  });

  return { add, remove, reorder };
}
