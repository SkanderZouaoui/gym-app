import type { BookingRules } from '@muscleup/shared'
import { useAppConfigDraft } from '../store/useAppConfigDraft'
import { Switch } from '../components/ui/Switch'

const COUNTERS: {
  key: keyof BookingRules
  label: string
  desc: string
  unit: string
  min: number
  max: number
  step: number
}[] = [
  { key: 'openDays', label: 'Ouverture des réservations', desc: 'Jours avant la séance', unit: 'j', min: 1, max: 30, step: 1 },
  { key: 'cancelHours', label: 'Annulation gratuite', desc: "Jusqu'à X heures avant le début", unit: 'h', min: 0, max: 48, step: 1 },
  { key: 'maxUpcomingBookings', label: 'Réservations simultanées', desc: 'Séances à venir max. par adhérent', unit: '', min: 1, max: 10, step: 1 },
  { key: 'noShowThreshold', label: 'Absences tolérées', desc: 'Avant blocage temporaire des réservations', unit: '', min: 1, max: 10, step: 1 },
  { key: 'blockDays', label: 'Durée du blocage', desc: 'Jours sans réservation possible', unit: 'j', min: 1, max: 30, step: 1 },
  { key: 'checkinWindowMin', label: 'Fenêtre de check-in', desc: 'Minutes avant le début', unit: 'min', min: 5, max: 60, step: 5 },
]

export function RulesPage() {
  const { draft, patch } = useAppConfigDraft()
  const rules = draft?.bookingRules
  if (!rules) return <p className="text-sm text-(--color-muted)">Chargement…</p>

  const setRule = (key: keyof BookingRules, value: number | boolean, label: string) =>
    patch({ bookingRules: { ...rules, [key]: value }, changeLabel: label })

  const summary = [
    `Réservation possible jusqu'à ${rules.openDays} jours à l'avance, ${rules.maxUpcomingBookings} séance(s) à venir maximum.`,
    rules.cancelHours > 0
      ? `Annulation gratuite jusqu'à ${rules.cancelHours} h avant le cours${
          rules.lateCancelAsNoShow ? ' ; au-delà, elle compte comme une absence.' : '.'
        }`
      : 'Toute annulation compte comme une absence.',
    `Après ${rules.noShowThreshold} absence(s), réservations bloquées ${rules.blockDays} jours.`,
    rules.waitlistEnabled
      ? `Cours complet : inscription en liste d'attente${rules.autoPromote ? ', place attribuée automatiquement.' : '.'}`
      : "Cours complet : pas de liste d'attente.",
    `Check-in ouvert ${rules.checkinWindowMin} min avant le début.`,
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Réservation &amp; accès</h1>
        <p className="text-sm text-(--color-muted)">
          Règles appliquées automatiquement à chaque réservation et entrée.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        {COUNTERS.map((c) => {
          const value = rules[c.key] as number
          return (
            <div key={c.key} className="flex flex-wrap items-center gap-3.5 border-b border-(--color-border) px-5 py-3.5 last:border-0">
              <div className="min-w-60 flex-1">
                <div className="text-sm font-bold">{c.label}</div>
                <div className="text-xs text-(--color-muted)">{c.desc}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRule(c.key, Math.max(c.min, value - c.step), c.label)}
                  className="grid h-8.5 w-8.5 place-items-center rounded-md border border-(--color-border-strong) hover:bg-(--color-surface-2)"
                >
                  <span className="material-symbols-rounded text-[18px]">remove</span>
                </button>
                <span className="w-18 text-center font-head text-base font-bold">
                  {value}
                  <span className="font-body text-xs font-medium text-(--color-muted)"> {c.unit}</span>
                </span>
                <button
                  onClick={() => setRule(c.key, Math.min(c.max, value + c.step), c.label)}
                  className="grid h-8.5 w-8.5 place-items-center rounded-md border border-(--color-border-strong) hover:bg-(--color-surface-2)"
                >
                  <span className="material-symbols-rounded text-[18px]">add</span>
                </button>
              </div>
            </div>
          )
        })}
        {(
          [
            ['waitlistEnabled', 'Liste d’attente', 'Quand un cours est complet'],
            ['autoPromote', 'Promotion automatique', 'La 1re personne en attente obtient la place libérée'],
            ['lateCancelAsNoShow', 'Annulation tardive = absence', 'Compte dans le quota d’absences'],
          ] as const
        ).map(([key, label, desc]) => (
          <div key={key} className="flex items-center gap-3.5 border-b border-(--color-border) px-5 py-3.5 last:border-0">
            <div className="flex-1">
              <div className="text-sm font-bold">{label}</div>
              <div className="text-xs text-(--color-muted)">{desc}</div>
            </div>
            <Switch checked={rules[key]} onChange={() => setRule(key, !rules[key], label)} />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-(--color-info-border) bg-(--color-info-soft) p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-(--color-info-ink)">
          <span className="material-symbols-rounded text-[20px]">visibility</span>
          Ce que lit l’adhérent dans l’app
        </div>
        {summary.map((l) => (
          <div key={l} className="flex gap-2 text-[13.5px]">
            <span className="text-(--color-info-ink)">•</span>
            <span>{l}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
