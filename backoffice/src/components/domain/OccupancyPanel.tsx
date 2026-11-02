import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_OCCUPANCY_POLICY, type OccupancyEstimate } from '@muscleup/shared'
import { apiErrorMessage } from '../../api/client'
import { useClearOccupancyOverride, useOccupancy, useSetOccupancyOverride } from '../../api/occupancy'
import { useAuth } from '../../store/auth'
import { Button, Card, Field, Icon, Modal, SectionHeader, Skeleton, useToast, cn } from '../ui'

/** Valeur spéciale « jusqu'à nouvel ordre » : le serveur la borne à la durée maximale (le réglage manuel expire toujours). */
const UNTIL_FURTHER_NOTICE = 1440
const DURATIONS = [{ value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 60, label: '1 h' }, { value: UNTIL_FURTHER_NOTICE, label: 'Jusqu’à nouvel ordre' }]
const clock = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

function AdjustModal({ current, onClose }: { current: OccupancyEstimate; onClose: () => void }) {
  const toast = useToast()
  const save = useSetOccupancyOverride()
  const [count, setCount] = useState(String(current.estimate))
  const [duration, setDuration] = useState(30)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const valid = count !== '' && Number(count) >= 0 && Number(count) <= 10_000

  return (
    <Modal
      title="Ajuster l’estimation"
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button icon="check" disabled={!valid} loading={save.isPending} onClick={() => save.mutate({ count: Number(count), durationMinutes: duration, note: note.trim() || undefined }, { onSuccess: () => { toast('Estimation ajustée'); onClose() }, onError: (e) => setError(apiErrorMessage(e, 'Enregistrement impossible. Réessayez.')) })}>Appliquer</Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted">Le chiffre saisi remplace l’estimation automatique pendant la durée choisie, puis le calcul reprend.</p>
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
        <Field label="Nombre de personnes" icon="groups" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} autoFocus />
        <div className="space-y-2">
          <div className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-muted">Durée de validité</div>
          <div className="flex flex-wrap gap-2">{DURATIONS.map((d) => <button key={d.value} onClick={() => setDuration(d.value)} className={cn('h-10 rounded-full px-4 text-sm font-bold transition', duration === d.value ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink hover:bg-primary-border/60')}>{d.label}</button>)}</div>
          {duration === UNTIL_FURTHER_NOTICE ? <p className="px-1 text-[13px] text-muted">Expire quand même au bout de {Math.round(DEFAULT_OCCUPANCY_POLICY.manualOverrideMaxDurationMinutes / 60)} h, pour qu’un chiffre ne reste jamais figé.</p> : null}
        </div>
        <Field label="Note (facultatif)" icon="sticky_note_2" placeholder="Ex. compétition, comptage à l’entrée" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  )
}

/**
 * Fréquentation estimée de la salle (accueil et admin).
 * ⚠️ Approximation : « Estimation ≈ N », jamais « N personnes ». La source (WiFi / app / manuel) reste affichée.
 */
export function OccupancyPanel() {
  const isAdmin = useAuth((s) => s.activeRole === 'ADMIN')
  const toast = useToast()
  const { data, isLoading } = useOccupancy()
  const clear = useClearOccupancyOverride()
  const [adjusting, setAdjusting] = useState(false)

  if (isLoading) return <Skeleton className="h-56 rounded-xl" />
  if (!data) return null
  const manual = data.source === 'MANUAL' && !!data.override
  const by = data.override?.setBy ? `${data.override.setBy.firstName} ${data.override.setBy.lastName.charAt(0)}.` : null

  return (
    <section className="space-y-3">
      <SectionHeader title="Fréquentation" icon="groups" action={isAdmin ? <Link to="/settings?section=occupancy" className="inline-flex items-center gap-0.5 text-sm font-bold text-primary-ink hover:underline">Réglages <Icon name="chevron_right" size={18} /></Link> : undefined} />
      <Card className="grid overflow-hidden lg:grid-cols-5">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-[#5b21b6] p-7 text-white lg:col-span-2">
          <div className="pointer-events-none absolute -right-14 -top-16 size-52 rounded-full bg-white/10" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/75">Fréquentation estimée</div>
            <div className="mt-2 flex items-end gap-2" role="heading" aria-level={2} aria-label={data.estimate === 1 ? 'Estimation ≈ 1 personne' : `Estimation ≈ ${data.estimate} personnes`}>
              <span className="mb-2 font-head text-3xl font-bold text-white/70">≈</span>
              <span className="font-head text-[72px] font-extrabold leading-none tracking-tight">{data.estimate}</span>
              <Icon name="groups" size={32} className="mb-2 text-white/70" />
            </div>
            <div className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
              <Icon name={manual ? 'edit' : 'wifi'} size={14} />
              <span className="truncate">
                {manual && data.override ? (by ? `Manuel · ${by} · jusqu’à ${clock(data.override.expiresAt)}` : `Manuel · jusqu’à ${clock(data.override.expiresAt)}`) : `WiFi : ${data.wifiCount} · App ailleurs : ${data.otherNetworkCount}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4 p-6 lg:col-span-3">
          {manual && data.override?.note ? <p className="text-sm italic">« {data.override.note} »</p> : null}
          <p className="text-sm text-muted">Approximation calculée à partir du WiFi de la salle et de l’activité de l’app : ce n’est pas un comptage exact.</p>
          {!data.publicIpConfigured ? (
            <div className="flex items-start gap-2.5 rounded-2xl bg-warning-soft px-4 py-3 text-sm font-semibold text-warning-ink">
              <Icon name="wifi_off" size={20} />
              <span>IP du WiFi de la salle non renseignée : seule l’activité de l’app est prise en compte. {isAdmin ? <Link to="/settings?section=occupancy" className="underline">Renseigner l’IP</Link> : null}</span>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" icon="tune" onClick={() => setAdjusting(true)}>Ajuster le chiffre</Button>
            {manual ? <Button variant="outline" icon="autorenew" loading={clear.isPending} onClick={() => clear.mutate(undefined, { onSuccess: () => toast('Retour au calcul automatique'), onError: (e) => toast(apiErrorMessage(e), 'danger') })}>Repasser en automatique</Button> : null}
          </div>
        </div>
      </Card>
      {adjusting ? <AdjustModal current={data} onClose={() => setAdjusting(false)} /> : null}
    </section>
  )
}
