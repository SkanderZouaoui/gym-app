import { useTranslation } from 'react-i18next';
import { GalleryEditor } from './GalleryEditor';
import { useAdminRooms } from '../hooks/useAdmin';
import { useGalleryMutations } from '../hooks/useGallery';

/** Photos d'une salle : affichées sur la fiche de chaque cours donné dans cette salle. */
export function RoomMediaSection({ roomId }: { roomId: string }) {
  const { t } = useTranslation();
  const { data: rooms } = useAdminRooms();
  const room = rooms?.find((x) => x.id === roomId);
  const mutations = useGalleryMutations('rooms', roomId);
  return (
    <GalleryEditor
      title={t('common.room_media_title')}
      hint={t('common.room_media_hint', { name: room?.name ?? '' })}
      keys={room?.galleryKeys ?? []}
      urls={room?.galleryUrls ?? []}
      mutations={mutations}
    />
  );
}
