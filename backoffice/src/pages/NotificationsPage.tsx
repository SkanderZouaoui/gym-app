import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutoNotifId, NotifSettings } from '@muscleup/shared'
import { AUTO_NOTIF_IDS } from '@muscleup/shared'
import { announcementsApi, plansApi } from '../api/endpoints'
import { useAppConfigDraft } from '../store/useAppConfigDraft'
import { Segmented } from '../components/ui/Segmented'
import { Switch } from '../components/ui/Switch'

const AUTO_META: Record<AutoNotifId, { name: string; desc: string; icon: string; channel: string }> = {
  sessionReminder: { name: 'Rappel avant séance', desc: '2 h avant le début', icon: 'alarm', channel: 'Push' },
  waitlistSpot: { name: 'Place libérée', desc: 'Liste d’attente : proposition automatique', icon: 'event_available', channel: 'Push' },
  membershipExpiring: { name: 'Abonnement bientôt expiré', desc: '7 jours avant l’échéance', icon: 'event_busy', channel: 'Push · E-mail' },
  sessionCancelled: { name: 'Cours annulé', desc: 'Immédiat, aux inscrits', icon: 'cancel', channel: 'Push · SMS' },
  inactivity: { name: 'Inactivité', desc: 'Après 14 jours sans entrée', icon: 'bedtime', channel: 'Push' },
}

const TONE_LABELS: Record<NotifSettings['defaultTone'], string> = { info: 'Info', accent: 'Promo', danger: 'Alerte' }

export function NotificationsPage() {
  const { draft, patch } = useAppConfigDraft()
  const queryClient = useQueryClient()
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: plansApi.findAll })

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [planId, setPlanId] = useState<string>('')
  const [tone, setTone] = useState<NotifSettings['defaultTone']>('info')

  const send = useMutation({
    mutationFn: () => announcementsApi.send({ title, body, planId: planId || undefined, tone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setTitle('')
      setBody('')
    },
  })

  const notif = draft?.notifSettings
  if (!notif) return <p className="text-sm text-(--color-muted)">Chargement…</p>

  const setNotif = (patchValue: Partial<NotifSettings>, label: string) =>
    patch({ notifSettings: { ...notif, ...patchValue }, changeLabel: label })

  const toggleChannel = (key: keyof NotifSettings['channels']) =>
    setNotif({ channels: { ...notif.channels, [key]: !notif.channels[key] } }, `Canal ${key} ${notif.channels[key] ? 'retiré' : 'ajouté'}`)

  const toggleAuto = (id: AutoNotifId) => {
    const next = notif.autos.map((a) => (a.id === id ? { ...a, on: !a.on } : a))
    setNotif({ autos: next }, `Notification « ${AUTO_META[id].name} »`)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Annonces &amp; notifications</h1>
        <p className="text-sm text-(--color-muted)">
          Diffusez une annonce et réglez les notifications automatiques.
        </p>
      </div>

      <section className="flex flex-col gap-3.5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
        <div className="font-head text-[15px] font-bold">Nouvelle annonce</div>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Titre
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Message
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="resize-vertical rounded-lg border border-(--color-border-strong) px-3 py-2.5 text-sm outline-none focus:border-(--color-primary)"
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Audience
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-[13.5px]"
            >
              <option value="">Tous les adhérents</option>
              {(plans ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  Formule {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Ton</span>
            <Segmented
              options={Object.values(TONE_LABELS)}
              value={TONE_LABELS[tone]}
              onChange={(v) => setTone((Object.entries(TONE_LABELS).find(([, l]) => l === v)?.[0] as NotifSettings['defaultTone']) ?? 'info')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-1">
          <button
            onClick={() => send.mutate()}
            disabled={!title.trim() || !body.trim() || send.isPending}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-(--color-primary) px-4 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover) disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-[18px]">send</span>
            {send.isPending ? 'Envoi…' : 'Envoyer maintenant'}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
        <div className="font-head text-[15px] font-bold">Canaux par défaut</div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['push', 'Push', 'notifications'],
              ['banner', 'Bannière d’accueil', 'view_agenda'],
              ['email', 'E-mail', 'mail'],
            ] as const
          ).map(([key, label, icon]) => {
            const on = notif.channels[key]
            return (
              <button
                key={key}
                onClick={() => toggleChannel(key)}
                className={`flex h-8.5 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${
                  on ? 'border-(--color-primary-border) bg-(--color-primary-soft) text-(--color-primary-ink)' : 'border-(--color-border) text-(--color-muted)'
                }`}
              >
                <span className="material-symbols-rounded text-[17px]">{icon}</span>
                {label}
              </button>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="border-b border-(--color-border) px-5 py-4">
          <div className="font-head text-[15px] font-bold">Notifications automatiques</div>
          <div className="text-[13px] text-(--color-muted)">Déclenchées par les événements de l’app.</div>
        </div>
        {AUTO_NOTIF_IDS.map((id) => {
          const meta = AUTO_META[id]
          const a = notif.autos.find((x) => x.id === id)
          return (
            <div key={id} className="flex items-center gap-3.5 border-b border-(--color-border) px-5 py-3 last:border-0">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-(--color-info-soft) text-(--color-info-ink)">
                <span className="material-symbols-rounded text-[20px]">{meta.icon}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{meta.name}</div>
                <div className="text-xs text-(--color-muted)">{meta.desc}</div>
              </div>
              <span className="text-xs font-semibold text-(--color-muted)">{meta.channel}</span>
              <Switch checked={a?.on ?? false} onChange={() => toggleAuto(id)} />
            </div>
          )
        })}
      </section>
    </div>
  )
}
