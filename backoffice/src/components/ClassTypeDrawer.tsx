import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classTypesApi, type ClassTypeItem, type CreateClassTypeInput } from '../api/endpoints'
import { Drawer } from './ui/Drawer'

const ICON_OPTS = [
  'local_fire_department',
  'self_improvement',
  'directions_bike',
  'sports_gymnastics',
  'sports_mma',
  'accessibility_new',
  'fitness_center',
  'directions_run',
  'pool',
]

const TONE_OPTS: { v: CreateClassTypeInput['tone']; l: string }[] = [
  { v: 'primary', l: 'Primaire' },
  { v: 'secondary', l: 'Secondaire' },
  { v: 'accent', l: 'Accent' },
  { v: 'success', l: 'Vert' },
  { v: 'info', l: 'Bleu' },
  { v: 'warning', l: 'Ambre' },
  { v: 'danger', l: 'Rouge' },
]

export function ClassTypeDrawer({ item, onClose }: { item: ClassTypeItem | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateClassTypeInput>(
    item
      ? {
          name: item.name,
          description: item.description ?? '',
          level: item.level ?? '',
          icon: item.icon,
          tone: item.tone,
          isBookable: item.isBookable,
          defaultCapacity: item.defaultCapacity,
          defaultDurationMin: item.defaultDurationMin,
        }
      : {
          name: '',
          description: '',
          level: 'Tous niveaux',
          icon: 'fitness_center',
          tone: 'primary',
          isBookable: true,
          defaultCapacity: 16,
          defaultDurationMin: 45,
        },
  )

  const [gallery, setGallery] = useState<{ keys: string[]; urls: string[] }>({
    keys: item?.galleryKeys ?? [],
    urls: item?.galleryUrls ?? [],
  })
  const [uploading, setUploading] = useState(false)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  /** Envoie chaque photo directement vers le stockage (URL présignée), puis l'ajoute à la galerie. */
  const uploadFiles = async (files: FileList | null) => {
    if (!item || !files || files.length === 0) return
    setGalleryError(null)
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) throw new Error('FILE_TOO_LARGE')
        const { key, uploadUrl } = await classTypesApi.galleryUploadUrl(item.id, file.type, file.size)
        const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
        if (!res.ok) throw new Error('UPLOAD_FAILED')
        const updated = await classTypesApi.addGalleryImage(item.id, key)
        setGallery({ keys: updated.galleryKeys, urls: updated.galleryUrls })
      }
      queryClient.invalidateQueries({ queryKey: ['class-types'] })
    } catch {
      setGalleryError('Envoi impossible : formats acceptés JPEG, PNG ou WebP, 10 Mo maximum.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const removeImage = async (key: string) => {
    if (!item) return
    const updated = await classTypesApi.removeGalleryImage(item.id, key)
    setGallery({ keys: updated.galleryKeys, urls: updated.galleryUrls })
    queryClient.invalidateQueries({ queryKey: ['class-types'] })
  }

  const save = useMutation({
    mutationFn: () => (item ? classTypesApi.update(item.id, form) : classTypesApi.create(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-types'] })
      onClose()
    },
  })

  return (
    <Drawer
      title={form.name || 'Nouveau cours'}
      subtitle={`${form.defaultDurationMin} min · ${form.defaultCapacity} places`}
      icon={form.icon}
      tone={form.tone}
      onClose={onClose}
      footer={
        <button
          onClick={() => save.mutate()}
          disabled={!form.name.trim() || save.isPending}
          className="h-10 flex-1 rounded-lg bg-(--color-primary) px-4 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover) disabled:opacity-50"
        >
          {item ? 'Enregistrer' : 'Ajouter'}
        </button>
      }
    >
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Nom du cours
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Description
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={4}
          placeholder="Présentez le cours : déroulé, matériel, public visé…"
          className="rounded-lg border border-(--color-border-strong) px-3 py-2 text-sm font-normal outline-none focus:border-(--color-primary)"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Niveau / intensité
        <input
          value={form.level}
          onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
          className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Durée (min)
          <input
            type="number"
            value={form.defaultDurationMin}
            onChange={(e) => setForm((f) => ({ ...f, defaultDurationMin: Number(e.target.value) }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Capacité par défaut
          <input
            type="number"
            value={form.defaultCapacity}
            onChange={(e) => setForm((f) => ({ ...f, defaultCapacity: Number(e.target.value) }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
          />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Pictogramme</span>
        <div className="grid grid-cols-5 gap-1.5">
          {ICON_OPTS.map((icon) => (
            <button
              key={icon}
              onClick={() => setForm((f) => ({ ...f, icon }))}
              className={`grid h-10 place-items-center rounded-lg border ${
                form.icon === icon ? 'border-(--color-primary) bg-(--color-primary-soft)' : 'border-(--color-border)'
              }`}
            >
              <span className="material-symbols-rounded text-[20px]">{icon}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Couleur</span>
        <div className="flex flex-wrap gap-1.5">
          {TONE_OPTS.map((t) => (
            <button
              key={t.v}
              onClick={() => setForm((f) => ({ ...f, tone: t.v }))}
              className={`h-8 rounded-full border px-3 text-xs font-semibold ${
                form.tone === t.v ? 'border-(--color-primary)' : 'border-(--color-border)'
              }`}
              style={{ background: `var(--color-${t.v}-soft)`, color: `var(--color-${t.v}-ink)` }}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">Galerie photos</span>
        {item ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {gallery.urls.map((url, i) => (
                <div key={gallery.keys[i]} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-(--color-border)">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(gallery.keys[i])}
                    aria-label="Supprimer la photo"
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <span className="material-symbols-rounded text-[16px]">delete</span>
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="grid aspect-[4/3] place-items-center rounded-lg border-2 border-dashed border-(--color-primary) bg-(--color-primary-soft) text-(--color-primary-ink) disabled:opacity-50"
              >
                <span className="flex flex-col items-center gap-0.5 text-xs font-bold">
                  <span className="material-symbols-rounded text-[22px]">{uploading ? 'hourglass_top' : 'add_photo_alternate'}</span>
                  {uploading ? 'Envoi…' : 'Ajouter'}
                </span>
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => uploadFiles(e.target.files)}
            />
            {galleryError ? <p className="text-xs font-semibold text-(--color-danger-ink)">{galleryError}</p> : null}
            <p className="text-xs text-(--color-muted)">Les photos s’affichent dans la fiche du cours de l’application.</p>
          </>
        ) : (
          <p className="rounded-lg bg-(--color-surface-2) p-3 text-xs text-(--color-muted)">
            Enregistrez d’abord le cours pour pouvoir ajouter des photos.
          </p>
        )}
      </div>
    </Drawer>
  )
}
