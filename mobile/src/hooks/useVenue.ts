import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import { normalizeImageType, readUploadBlob } from '../utils/upload';
import type { DayHours } from '../utils/openingHours';
import type { GallerySource } from '../components/gallery/photos';

export interface VenueContact {
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Venue {
  name: string;
  logoUrl: string | null;
  /** Lundi → dimanche. */
  hours: DayHours[];
  /** null : non communiquées (adhérent, case « visible par les adhérents » décochée). */
  contact: VenueContact | null;
  gallery: GallerySource;
}

/** Fiche de la salle (nom, logo, horaires, photos, coordonnées selon le rôle). */
export function useVenue() {
  return useQuery({
    queryKey: ['venue'],
    queryFn: () => apiRequest<Venue>('/v1/venue'),
    staleTime: 5 * 60_000,
  });
}

/** Logo de la salle (admin) : envoi direct au stockage puis enregistrement (réduit et converti par l'API), ou retrait. */
export function useVenueLogoMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['venue'] });
  const upload = useMutation({
    mutationFn: async (image: { uri: string; mimeType?: string | null }) => {
      const contentType = normalizeImageType(image.mimeType);
      const blob = await readUploadBlob(image.uri);
      const { key, uploadUrl } = await apiRequest<{ key: string; uploadUrl: string }>('/v1/admin/settings/logo/upload-url', {
        method: 'POST',
        body: { contentType, sizeBytes: blob.size },
      });
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
      if (!put.ok) throw new Error('UPLOAD_FAILED');
      await apiRequest('/v1/admin/settings/logo', { method: 'PUT', body: { key } });
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: () => apiRequest('/v1/admin/settings/logo', { method: 'DELETE' }),
    onSettled: refresh,
  });
  return { upload, remove };
}
