import { useRef, useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import type { GalleryFields } from '../../api/catalog'
import { Icon, cn } from '../ui'

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

  const run = async (action: () => Promise<GalleryFields>, fallback: string) => {
    setError(null)
    try {
      setState(await action())
    } catch (e) {
      setError(apiErrorMessage(e, fallback))
    }
  }

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    let failed = 0
    for (const file of Array.from(files).slice(0, MAX - state.galleryKeys.length)) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > MAX_BYTES) {
        failed++
        continue
      }
      try {
        setState(await api.upload(file))
      } catch {
        failed++
      }
    }
    if (failed) setError(`${failed} photo${failed > 1 ? 's' : ''} non envoyée${failed > 1 ? 's' : ''} : JPEG, PNG ou WebP, 10 Mo maximum.`)
    setBusy(false)
    if (input.current) input.current.value = ''
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
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
      {error ? <p role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-danger-ink"><Icon name="error" size={16} />{error}</p> : null}
      <p className="text-xs text-muted">{state.galleryKeys.length}/{MAX} photos · glissez-déposez pour changer l’ordre, la première sert de couverture.</p>
    </div>
  )
}
