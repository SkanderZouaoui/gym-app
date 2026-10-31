import { useTranslation } from 'react-i18next';
import { GalleryEditor } from './GalleryEditor';
import { useAllClassTypes } from '../hooks/useAdmin';
import { useGalleryMutations } from '../hooks/useGallery';

/** Photos d'un type de cours : communes à tous les cours de ce type, importées une seule fois. */
export function ClassTypeMediaSection({ typeId }: { typeId: string }) {
  const { t } = useTranslation();
  const { data: types } = useAllClassTypes();
  const type = types?.find((x) => x.id === typeId);
  const mutations = useGalleryMutations('class-types', typeId);
  return (
    <GalleryEditor
      title={t('common.class_media_title')}
      hint={t('common.class_media_shared_hint', { name: type?.name ?? '' })}
      keys={type?.galleryKeys ?? []}
      urls={type?.galleryUrls ?? []}
      mutations={mutations}
    />
  );
}
