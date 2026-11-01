import { useEffect, useMemo, useRef, useState } from 'react'
import { boxForRatio, boxToPixels, containSize, moveBox, resizeCorner, type Box, type Corner, type Size } from '../../lib/crop'
import { Button, Icon, Modal, cn } from '../ui'

/** Côté le plus long de la photo enregistrée : assez pour un grand écran, bien en deçà de la limite d'envoi (10 Mo). */
const MAX_SIDE = 2400
const MIN_BOX = 48
const HIT = 22
const RATIOS: { key: string; label: string; ratio: number | null }[] = [
  { key: 'free', label: 'Libre', ratio: null },
  { key: '16:10', label: '16:10', ratio: 16 / 10 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '1:1', label: '1:1', ratio: 1 },
  { key: '3:4', label: '3:4', ratio: 3 / 4 },
]

type Source = File | Blob | string

async function loadBitmap(source: Source): Promise<ImageBitmap> {
  const blob = typeof source === 'string' ? await (await fetch(source)).blob() : source
  // « from-image » applique l'orientation EXIF : la photo s'affiche comme sur le téléphone.
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

/** Dessine la photo tournée (quarts de tour) et/ou en miroir sur un canvas à sa taille réelle. */
function transformed(bitmap: ImageBitmap, rot: number, flip: boolean): HTMLCanvasElement {
  const quarter = rot % 2 === 1
  const canvas = document.createElement('canvas')
  canvas.width = quarter ? bitmap.height : bitmap.width
  canvas.height = quarter ? bitmap.width : bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rot * Math.PI) / 2)
  if (flip) ctx.scale(-1, 1)
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  return canvas
}

interface Props {
  /** Fichier choisi, ou URL d'une photo déjà en galerie. */
  source: Source
  fileName?: string
  title: string
  confirmLabel: string
  /** « 2/5 » quand plusieurs photos s'enchaînent. */
  progress?: string
  /** Si fourni, propose d'utiliser la photo telle quelle. */
  onSkip?: () => void
  onCancel: () => void
  onDone: (file: File) => void
}

/**
 * Retouche d'une photo avant envoi (même parcours que sur le mobile) : rognage libre ou à proportions fixes avec poignées
 * aux quatre coins, rotation par quarts de tour, miroir, retour à l'original.
 */
export function ImageEditor({ source, fileName = 'photo', title, confirmLabel, progress, onSkip, onCancel, onDone }: Props) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  const [failed, setFailed] = useState(false)
  const [rot, setRot] = useState(0)
  const [flip, setFlip] = useState(false)
  const [ratio, setRatio] = useState<number | null>(null)
  // Cadre déplacé ou redimensionné à la main ; null = cadre par défaut (toute l'image, aux proportions choisies).
  const [custom, setCustom] = useState<Box | null>(null)
  const [area, setArea] = useState<Size>({ w: 0, h: 0 })
  const [busy, setBusy] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ mode: 'move' | Corner; start: Box; x0: number; y0: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBitmap(source)
      .then((b) => !cancelled && setBitmap(b))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [source])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setArea({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [bitmap])

  const working = useMemo(() => (bitmap ? transformed(bitmap, rot, flip) : null), [bitmap, rot, flip])
  const disp = useMemo<Size>(() => (working && area.w > 0 ? containSize({ w: working.width, h: working.height }, area) : { w: 0, h: 0 }), [working, area])

  useEffect(() => {
    const c = preview.current
    if (!c || !working || disp.w === 0) return
    c.width = Math.round(disp.w)
    c.height = Math.round(disp.h)
    c.getContext('2d')!.drawImage(working, 0, 0, c.width, c.height)
  }, [working, disp])

  const defaultFrac = useMemo<Box>(() => {
    if (disp.w === 0) return { x: 0, y: 0, w: 1, h: 1 }
    const b = boxForRatio(disp, ratio)
    return { x: b.x / disp.w, y: b.y / disp.h, w: b.w / disp.w, h: b.h / disp.h }
  }, [ratio, disp])
  const frac = custom ?? defaultFrac

  const box: Box = { x: frac.x * disp.w, y: frac.y * disp.h, w: frac.w * disp.w, h: frac.h * disp.h }

  const down = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const corners: [Corner, number, number][] = [['tl', box.x, box.y], ['tr', box.x + box.w, box.y], ['bl', box.x, box.y + box.h], ['br', box.x + box.w, box.y + box.h]]
    const hit = corners.find(([, cx, cy]) => Math.abs(px - cx) <= HIT && Math.abs(py - cy) <= HIT)
    const inside = px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h
    if (!hit && !inside) return
    drag.current = { mode: hit ? hit[0] : 'move', start: box, x0: e.clientX, y0: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    const next = d.mode === 'move' ? moveBox(d.start, dx, dy, disp) : resizeCorner(d.start, d.mode, dx, dy, disp, ratio, MIN_BOX)
    setCustom({ x: next.x / disp.w, y: next.y / disp.h, w: next.w / disp.w, h: next.h / disp.h })
  }
  const up = () => {
    drag.current = null
  }

  const turn = (dir: 1 | -1) => {
    setRot((r) => (r + dir + 4) % 4)
    setCustom(null)
    setRatio(null)
  }
  const reset = () => {
    setRot(0)
    setFlip(false)
    setRatio(null)
    setCustom(null)
  }

  const apply = async () => {
    if (!working || disp.w === 0) return
    setBusy(true)
    try {
      const crop = boxToPixels(box, disp, { w: working.width, h: working.height })
      const scale = Math.min(1, MAX_SIDE / Math.max(crop.width, crop.height))
      const out = document.createElement('canvas')
      out.width = Math.max(1, Math.round(crop.width * scale))
      out.height = Math.max(1, Math.round(crop.height * scale))
      out.getContext('2d')!.drawImage(working, crop.originX, crop.originY, crop.width, crop.height, 0, 0, out.width, out.height)
      const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/jpeg', 0.88))
      if (!blob) throw new Error('ENCODE_FAILED')
      onDone(new File([blob], `${fileName.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' }))
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  const ready = !!working && disp.w > 0
  const tool = 'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition'
  return (
    <Modal
      title={progress ? `${title} · ${progress}` : title}
      onClose={onCancel}
      width="max-w-3xl"
      footer={
        <>
          {onSkip ? <Button variant="ghost" className="mr-auto" onClick={onSkip}>Utiliser telle quelle</Button> : null}
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button icon="check" disabled={!ready} loading={busy} onClick={() => void apply()}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div ref={areaRef} className="relative grid h-[50vh] min-h-72 place-items-center overflow-hidden rounded-2xl bg-secondary/95 select-none">
          {failed ? (
            <div className="flex flex-col items-center gap-2 px-6 text-center text-white"><Icon name="error" size={32} /><p className="text-sm font-semibold">Impossible de charger ou de modifier cette photo.</p></div>
          ) : !ready ? (
            <Icon name="progress_activity" size={28} className="animate-spin text-white" />
          ) : (
            <div className="relative touch-none" style={{ width: disp.w, height: disp.h, cursor: 'crosshair' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
              <canvas ref={preview} className="absolute inset-0 size-full" />
              {/* zones écartées, assombries */}
              <div className="pointer-events-none absolute left-0 right-0 top-0 bg-black/60" style={{ height: box.y }} />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/60" style={{ top: box.y + box.h }} />
              <div className="pointer-events-none absolute left-0 bg-black/60" style={{ top: box.y, height: box.h, width: box.x }} />
              <div className="pointer-events-none absolute right-0 bg-black/60" style={{ top: box.y, height: box.h, left: box.x + box.w }} />
              <div className="pointer-events-none absolute border-[1.5px] border-white" style={{ left: box.x, top: box.y, width: box.w, height: box.h, cursor: 'move' }}>
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/50" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/50" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/50" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/50" />
                {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((c) => (
                  <span key={c} className={cn('absolute size-5 border-white', c === 'tl' && '-left-[3px] -top-[3px] rounded-tl-md border-l-4 border-t-4', c === 'tr' && '-right-[3px] -top-[3px] rounded-tr-md border-r-4 border-t-4', c === 'bl' && '-bottom-[3px] -left-[3px] rounded-bl-md border-b-4 border-l-4', c === 'br' && '-bottom-[3px] -right-[3px] rounded-br-md border-b-4 border-r-4')} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RATIOS.map((r) => (
            <button key={r.key} onClick={() => {
              setRatio(r.ratio)
              setCustom(null)
            }} className={cn(tool, ratio === r.ratio ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink hover:bg-primary-border/60')}>{r.label}</button>
          ))}
          <span className="mx-1 h-6 w-px bg-border" />
          <button onClick={() => turn(-1)} aria-label="Pivoter à gauche" title="Pivoter à gauche" className={cn(tool, 'bg-surface-2 hover:bg-primary-soft')}><Icon name="rotate_left" size={20} /></button>
          <button onClick={() => turn(1)} aria-label="Pivoter à droite" title="Pivoter à droite" className={cn(tool, 'bg-surface-2 hover:bg-primary-soft')}><Icon name="rotate_right" size={20} /></button>
          <button onClick={() => setFlip((f) => !f)} aria-label="Miroir" title="Miroir" className={cn(tool, flip ? 'bg-primary text-white' : 'bg-surface-2 hover:bg-primary-soft')}><Icon name="flip" size={20} /></button>
          <button onClick={reset} className={cn(tool, 'ml-auto bg-surface-2 hover:bg-primary-soft')}><Icon name="restart_alt" size={20} />Réinitialiser</button>
        </div>
      </div>
    </Modal>
  )
}
