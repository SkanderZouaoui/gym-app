import { useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { useClassTypes, useCoaches, useRooms, useSaveSession } from '../../api/catalog'
import type { SessionSummary } from '../../api/types'
import { minutesBetween } from '../../lib/sessions'
import { useNow } from '../../lib/hooks'
import { Button, Field, Icon, Modal, SelectField, useToast } from '../ui'

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/**
 * Création et modification d'un cours (admin) : type, date et heure, durée, coach, salle, capacité — les champs de
 * l'écran « cours » du mobile. Un cours déjà commencé n'est plus modifiable (règle appliquée aussi par l'API).
 */
export function SessionFormModal({ session, defaultDay, onClose }: { session?: SessionSummary; defaultDay?: Date; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveSession()
  const types = useClassTypes()
  const coaches = useCoaches()
  const rooms = useRooms()
  const [fallbackDay] = useState(() => new Date())
  const now = useNow()
  const start = session ? new Date(session.startsAt) : defaultDay ?? fallbackDay
  const [typeId, setTypeId] = useState(session?.classType.id ?? '')
  const [date, setDate] = useState(toDate(start))
  const [time, setTime] = useState(session ? toTime(start) : '18:00')
  const [duration, setDuration] = useState(session ? String(minutesBetween(session.startsAt, session.endsAt)) : '45')
  const [coachId, setCoachId] = useState(session?.coachId ?? '')
  const [roomId, setRoomId] = useState(session?.roomId ?? session?.room?.id ?? '')
  const [capacity, setCapacity] = useState(session ? String(session.capacity) : '16')
  const [error, setError] = useState<string | null>(null)

  const activeTypes = (types.data ?? []).filter((t) => t.isActive || t.id === typeId)
  const startsAt = new Date(`${date}T${time}`)
  const inPast = !session && startsAt.getTime() <= now
  const valid = typeId && date && time && Number(duration) >= 5 && Number(capacity) >= 1 && !Number.isNaN(startsAt.getTime())

  const pickType = (id: string) => {
    setTypeId(id)
    const t = types.data?.find((x) => x.id === id)
    // Un nouveau cours reprend la capacité et la durée par défaut de son type.
    if (t && !session) {
      setCapacity(String(t.defaultCapacity))
      setDuration(String(t.defaultDurationMin))
    }
  }

  return (
    <Modal
      title={session ? 'Modifier le cours' : 'Nouveau cours'}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            icon="check"
            disabled={!valid || inPast}
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                { id: session?.id, classTypeId: typeId, startsAt: startsAt.toISOString(), durationMin: Number(duration), coachId: coachId || null, roomId: roomId || null, capacity: Number(capacity) },
                {
                  onSuccess: () => {
                    toast(session ? 'Cours modifié' : 'Cours créé')
                    onClose()
                  },
                  onError: (e) => setError(apiErrorMessage(e, "Impossible d'enregistrer le cours.")),
                },
              )
            }
          >
            {session ? 'Enregistrer' : 'Créer le cours'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
        {inPast ? <div className="flex gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-sm font-semibold text-warning-ink"><Icon name="info" size={18} />Choisissez une date et une heure à venir.</div> : null}
        <SelectField label="Type de cours" icon="exercise" value={typeId} onChange={(e) => pickType(e.target.value)}>
          <option value="">Choisir…</option>
          {activeTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date" icon="event" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:col-span-1" />
          <Field label="Heure" icon="schedule" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Field label="Durée (min)" icon="timelapse" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Coach" icon="sports" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
            <option value="">Sans coach</option>
            {(coaches.data ?? []).map((c) => <option key={c.userId} value={c.userId}>{c.user.firstName} {c.user.lastName}</option>)}
          </SelectField>
          <SelectField label="Salle" icon="meeting_room" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">Aucune</option>
            {(rooms.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </SelectField>
        </div>
        <Field label="Capacité (places)" icon="groups" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} />
      </div>
    </Modal>
  )
}
