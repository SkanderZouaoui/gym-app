import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { occupancyApi } from '../api/endpoints'
import { getApiErrorMessage } from '../api/client'
import { Segmented } from './ui/Segmented'

/** « Jusqu'à nouvel ordre » : le serveur borne à la durée maximale, un réglage manuel expire toujours. */
const DURATIONS: { label: string; minutes: number }[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: 'Jusqu’à nouvel ordre', minutes: 1440 },
]

const clock = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/**
 * Fréquentation estimée de la salle. ⚠️ APPROXIMATION (WiFi de la salle + activité de l'app) :
 * toujours affichée « Estimation ≈ N », jamais comme un comptage exact.
 */
export function OccupancyPanel() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['occupancy'], queryFn: occupancyApi.get, refetchInterval: 60_000 })
  const [editing, setEditing] = useState(false)
  const [count, setCount] = useState('')
  const [duration, setDuration] = useState(DURATIONS[1].label)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSaved = (next: Awaited<ReturnType<typeof occupancyApi.get>>) => {
    queryClient.setQueryData(['occupancy'], next)
    setEditing(false)
    setNote('')
  }
  const save = useMutation({
    mutationFn: occupancyApi.setOverride,
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err)),
  })
  const clear = useMutation({
    mutationFn: occupancyApi.clearOverride,
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  if (isLoading || !data) {
    return <p className="text-sm text-(--color-muted)">Chargement de la fréquentation…</p>
  }

  const manual = data.source === 'MANUAL' && data.override
  const validCount = count.trim() !== '' && Number(count) >= 0 && Number(count) <= 10_000

  return (
    <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span className="material-symbols-rounded flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-(--color-primary-soft) text-[22px] text-(--color-primary-ink)">
          groups
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-(--color-muted)">Fréquentation estimée</div>
          <div className="font-head text-2xl font-extrabold">
            Estimation ≈ {data.estimate} {data.estimate === 1 ? 'personne' : 'personnes'}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[13px] text-(--color-muted)">
            <span className="material-symbols-rounded text-[16px]">{manual ? 'edit' : 'wifi'}</span>
            {manual
              ? `Manuel${manual.setBy ? ` · ${manual.setBy.firstName} ${manual.setBy.lastName}` : ''} · jusqu’à ${clock(manual.expiresAt)}`
              : `WiFi : ${data.wifiCount} · App ouverte ailleurs : ${data.otherNetworkCount}`}
          </div>
          {manual && manual.note ? <div className="mt-1 text-[13px] italic">« {manual.note} »</div> : null}
        </div>
        {manual ? (
          <span className="rounded-full bg-(--color-warning-soft) px-2.5 py-1 text-xs font-bold text-(--color-warning-ink)">
            Réglé manuellement
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[12.5px] text-(--color-muted)">
        Approximation calculée à partir du WiFi de la salle et de l’activité de l’app : ce n’est pas un comptage exact.
      </p>

      {!data.publicIpConfigured ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-(--color-warning-border) bg-(--color-warning-soft) px-3 py-2 text-[13px] text-(--color-warning-ink)">
          <span className="material-symbols-rounded text-[18px]">wifi_off</span>
          <span className="flex-1">
            IP du WiFi de la salle non renseignée : seule l’activité de l’app est prise en compte.
          </span>
          <Link to="/settings" className="font-bold underline">
            Configurer
          </Link>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-(--color-border) p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Nombre de personnes</label>
              <input
                type="number"
                min={0}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="h-10 w-32 rounded-lg border border-(--color-border) px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Durée de validité</label>
              <Segmented options={DURATIONS.map((d) => d.label)} value={duration} onChange={setDuration} />
            </div>
          </div>
          {duration === DURATIONS[3].label ? (
            <p className="text-[12.5px] text-(--color-muted)">
              Expire quand même à la durée maximale définie dans les paramètres, pour qu’un chiffre ne reste jamais figé.
            </p>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Note (facultatif)</label>
            <input
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. compétition, comptage à l’entrée"
              className="h-10 rounded-lg border border-(--color-border) px-3 text-sm"
            />
          </div>
          {error ? <p className="text-sm font-medium text-(--color-danger)">{error}</p> : null}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError(null)
                save.mutate({
                  count: Number(count),
                  durationMinutes: DURATIONS.find((d) => d.label === duration)?.minutes,
                  note: note.trim() || undefined,
                })
              }}
              disabled={!validCount || save.isPending}
              className="h-10 rounded-lg bg-(--color-primary) px-4 text-sm font-bold text-white hover:bg-(--color-primary-hover) disabled:opacity-50"
            >
              Appliquer
            </button>
            <button
              onClick={() => setEditing(false)}
              className="h-10 rounded-lg border border-(--color-border-strong) px-4 text-sm font-bold hover:bg-(--color-surface-2)"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setError(null)
              setCount(String(data.estimate))
              setEditing(true)
            }}
            className="h-10 rounded-lg border border-(--color-border-strong) px-4 text-sm font-bold hover:bg-(--color-surface-2)"
          >
            Ajuster le chiffre
          </button>
          {manual ? (
            <button
              onClick={() => {
                setError(null)
                clear.mutate()
              }}
              disabled={clear.isPending}
              className="h-10 rounded-lg px-4 text-sm font-bold text-(--color-primary-ink) hover:bg-(--color-primary-soft) disabled:opacity-50"
            >
              Repasser en automatique
            </button>
          ) : null}
          {error ? <p className="w-full text-sm font-medium text-(--color-danger)">{error}</p> : null}
        </div>
      )}
    </section>
  )
}
