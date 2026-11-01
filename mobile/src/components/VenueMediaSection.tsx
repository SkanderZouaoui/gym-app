import { useTranslation } from 'react-i18next';
import { GalleryEditor } from './GalleryEditor';
import { useGalleryMutations, useVenueGallery } from '../hooks/useGallery';

/** Photos de l'établissement (accueil, salles, vestiaires…), gérées par l'admin depuis « Salle et horaires ». */
export function VenueMediaSection() {
  const { t } = useTranslation();
  const { data } = useVenueGallery();
  const mutations = useGalleryMutations('organization', 'venue');
  return (
    <GalleryEditor
      title={t('admin.venue_media_title')}
      hint={t('admin.venue_media_hint')}
      keys={data?.galleryKeys ?? []}
      urls={data?.galleryUrls ?? []}
      mutations={mutations}
    />
  );
}
