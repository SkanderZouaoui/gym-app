import { useRef, useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import type { GalleryFields } from '../../api/catalog'
import { Icon, cn } from '../ui'
import { ImageEditor } from './ImageEditor'

const MAX = 12
const MAX_BYTES = 10 * 1024 * 1024

interface Api {
  upload: (file: File) => Promise<GalleryFields>
  remove: (key: string) => Promise<GalleryFields>
  reorder: (keys: string[]) => Promise<GalleryFields>
}

/**
 * Galerie photos (type de cours, salle) : envoi multiple, suppression, réordonnancement par glisser-déposer ;
 * la première photo est la couverture. Mêmes limites que le mobile : 12 photos, 10 Mo, JPEG / PNG / WebP.
 */
export function GalleryManager({ initial, api }: { initial: GalleryFields; api: Api }) {
  const [state, setState] = useState<GalleryFields>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  // Import : chaque photo choisie passe par l'éditeur (rogner, pivoter…) avant d'être envoyée.
  const [queue, setQueue] = useState<{ files: File[]; index: number; done: File[] } | null>(null)
  // Retouche d'une photo déjà en galerie : elle est remplacée à la même place.
  const [editing, setEditing] = useState<{ key: string; url: string; index: number } | null>(null)

  const run = async (action: () => Promise<GalleryFields>, fallback: string) => {
    setError(null)
    try {
      setState(await action())
    } catch (e) {
      setError(apiErrorMessage(e, fallback))
    }
  }

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    const valid = Array.from(files).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) && f.size <= MAX_BYTES).slice(0, MAX - state.galleryKeys.length)
    const rejected = files.length - valid.length
    if (rejected > 0 && valid.length < files.length) setError(`${rejected} fichier${rejected > 1 ? 's' : ''} ignoré${rejected > 1 ? 's' : ''} : JPEG, PNG ou WebP, 10 Mo maximum, 12 photos au total.`)
    if (valid.length > 0) setQueue({ files: valid, index: 0, done: [] })
    if (input.current) input.current.value = ''
  }

  const uploadAll = async (files: File[]) => {
    setBusy(true)
    let failed = 0
    for (const file of files) {
      try {
        setState(await api.upload(file))
      } catch {
        failed++
      }
    }
    if (failed) setError(`${failed} photo${failed > 1 ? 's' : ''} non envoyée${failed > 1 ? 's' : ''}. Réessayez.`)
    setBusy(false)
  }

  /** Photo suivante de l'import (retouchée ou telle quelle) ; la dernière déclenche l'envoi de toutes. */
  const advance = (file: File) => {
    if (!queue) return
    const done = [...queue.done, file]
    if (queue.index + 1 < queue.files.length) setQueue({ ...queue, index: queue.index + 1, done })
    else {
      setQueue(null)
      void uploadAll(done)
    }
  }

  /** La version retouchée est envoyée d'abord (l'originale reste intacte en cas d'échec), puis l'ancienne est supprimée et la nouvelle replacée à son rang. */
  const replace = async (file: File) => {
    const target = editing
    setEditing(null)
    if (!target) return
    if (state.galleryKeys.length >= MAX) {
      setError('Galerie pleine : supprimez une photo avant de pouvoir en modifier une.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.upload(file)
      const afterRemove = await api.remove(target.key)
      const keys = [...afterRemove.galleryKeys]
      const added = keys.pop()! // la photo retouchée vient d'être ajoutée en dernier
      keys.splice(Math.min(target.index, keys.length), 0, added)
      setState(await api.reorder(keys))
    } catch (e) {
      setError(apiErrorMessage(e, "Impossible d'enregistrer la photo modifiée. L'originale est conservée."))
    } finally {
      setBusy(false)
    }
  }

  const drop = (to: number) => {
    const source = from
    setFrom(null)
    setOver(null)
    if (source === null || source === to) return
    const keys = [...state.galleryKeys]
    const urls = [...state.galleryUrls]
    const thumbs = [...(state.galleryThumbUrls ?? state.galleryUrls)]
    for (const list of [keys, urls, thumbs]) list.splice(to, 0, ...list.splice(source, 1))
    setState({ galleryKeys: keys, galleryUrls: urls, galleryThumbUrls: thumbs }) // affichage immédiat, le serveur confirme
    void run(() => api.reorder(keys), "Impossible de changer l'ordre.")
  }

  const full = state.galleryKeys.length >= MAX
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {state.galleryKeys.map((key, i) => (
          <div
            key={key}
            draggable
            onDragStart={() => setFrom(i)}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(i)
            }}
            onDrop={() => drop(i)}
            onDragEnd={() => {
              setFrom(null)
              setOver(null)
            }}
            className={cn('group relative aspect-square cursor-grab overflow-hidden rounded-2xl border bg-surface-2 active:cursor-grabbing', over === i && from !== i ? 'border-primary ring-2 ring-primary' : 'border-border', from === i && 'opacity-40')}
          >
            <img src={state.galleryThumbUrls?.[i] ?? state.galleryUrls[i]} alt="" draggable={false} className="size-full object-cover" />
            <button
              onClick={() => setEditing({ key, url: state.galleryUrls[i], index: i })}
              aria-label="Rogner ou modifier la photo"
              title="Rogner ou modifier"
              className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              <Icon name="crop_rotate" size={16} />
            </button>
            {i === 0 ? <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white"><Icon name="star" size={11} filled />Couverture</span> : null}
            <button
              onClick={() => void run(() => api.remove(key), 'Suppression impossible.')}
              aria-label="Supprimer la photo"
              className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
        {!full ? (
          <button
            onClick={() => input.current?.click()}
            disabled={busy}
            className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-primary-border bg-primary-soft text-primary-ink transition hover:bg-primary-border/40 disabled:opacity-60"
          >
            <span className="flex flex-col items-center gap-1 text-xs font-bold">
              <Icon name={busy ? 'progress_activity' : 'add_photo_alternate'} size={28} className={busy ? 'animate-spin' : ''} />
              {busy ? 'Envoi…' : 'Ajouter'}
            </span>
          </button>
        ) : null}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      {error ? <p role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-danger-ink"><Icon name="error" size={16} />{error}</p> : null}
      {queue ? (
        <ImageEditor
          key={queue.index}
          source={queue.files[queue.index]}
          fileName={queue.files[queue.index].name}
          title="Modifier la photo"
          progress={queue.files.length > 1 ? `${queue.index + 1}/${queue.files.length}` : undefined}
          confirmLabel={queue.files.length > 1 && queue.index + 1 < queue.files.length ? 'Suivante' : 'Enregistrer'}
          onSkip={() => advance(queue.files[queue.index])}
          onCancel={() => setQueue(null)}
          onDone={advance}
        />
      ) : null}
      {editing ? <ImageEditor source={editing.url} title="Modifier la photo" confirmLabel="Enregistrer" onCancel={() => setEditing(null)} onDone={(f) => void replace(f)} /> : null}
      <p className="text-xs text-muted">{state.galleryKeys.length}/{MAX} photos · glissez-déposez pour changer l’ordre, la première sert de couverture.</p>
    </div>
  )
}
