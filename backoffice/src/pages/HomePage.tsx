import type { HomeModule } from '@muscleup/shared'
import { useAppConfigDraft } from '../store/useAppConfigDraft'
import { Switch } from '../components/ui/Switch'

const MODULE_LABELS: Record<HomeModule['id'], { name: string; desc: string; icon: string }> = {
  announce: { name: 'Bannière d’annonce', desc: 'Contenu géré dans Annonces', icon: 'campaign' },
  qr: { name: 'Carte d’accès QR', desc: "Code d'entrée en salle", icon: 'qr_code_2' },
  next: { name: 'Prochaine séance', desc: 'Réservation la plus proche', icon: 'event' },
  challenge: { name: 'Défi du mois', desc: 'Objectif collectif et progression', icon: 'emoji_events' },
  week: { name: 'Activité de la semaine', desc: "Minutes d'entraînement par jour", icon: 'bar_chart' },
  courses: { name: 'Cours à venir', desc: 'Suggestions réservables', icon: 'calendar_month' },
}

export function HomePage() {
  const { draft, patch } = useAppConfigDraft()
  const modules = draft?.homeModules
  const strings = draft?.strings
  const greeting = strings?.find((s) => s.k === 'home.greeting')

  if (!modules || !strings) return <p className="text-sm text-(--color-muted)">Chargement…</p>

  const toggle = (i: number) => {
    const m = modules[i]
    const next = modules.map((x, j) => (j === i ? { ...x, on: !x.on } : x))
    patch({ homeModules: next, changeLabel: `Bloc « ${MODULE_LABELS[m.id].name} » ${m.on ? 'masqué' : 'affiché'}` })
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= modules.length) return
    const next = [...modules]
    ;[next[i], next[j]] = [next[j], next[i]]
    patch({ homeModules: next, changeLabel: "Ordre des blocs d'accueil" })
  }

  const setGreeting = (fr: string) => {
    const next = strings.map((s) => (s.k === 'home.greeting' ? { ...s, fr } : s))
    patch({ strings: next, changeLabel: 'Salutation' })
  }

  const modulesOn = modules.filter((m) => m.on).length

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Écran d’accueil</h1>
        <p className="text-sm text-(--color-muted)">
          Composez l’accueil adhérent : message, blocs affichés et leur ordre.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
        <div className="font-head text-[15px] font-bold">Message d’accueil</div>
        <input
          value={greeting?.fr ?? ''}
          onChange={(e) => setGreeting(e.target.value)}
          className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-(--color-muted)">
          Variables :
          {['{prénom}', '{salle}'].map((v) => (
            <button
              key={v}
              onClick={() => setGreeting(`${greeting?.fr ?? ''} ${v}`)}
              className="h-6.5 rounded-full border border-(--color-border) bg-(--color-surface-2) px-2.5 font-mono text-xs hover:border-(--color-primary)"
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="flex items-center justify-between gap-3 border-b border-(--color-border) px-5 py-4">
          <div>
            <div className="font-head text-[15px] font-bold">Blocs de l’accueil</div>
            <div className="text-[13px] text-(--color-muted)">
              Activez et ordonnez les blocs affichés aux adhérents.
            </div>
          </div>
          <span className="text-xs font-bold text-(--color-muted)">
            {modulesOn} / {modules.length} actifs
          </span>
        </div>
        {modules.map((m, i) => {
          const meta = MODULE_LABELS[m.id]
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 border-b border-(--color-border) px-5 py-3 last:border-0"
              style={{ opacity: m.on ? 1 : 0.6 }}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Monter"
                  className="h-5.5 w-7 text-(--color-muted) disabled:opacity-30"
                >
                  <span className="material-symbols-rounded text-[20px]">keyboard_arrow_up</span>
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === modules.length - 1}
                  aria-label="Descendre"
                  className="h-5.5 w-7 text-(--color-muted) disabled:opacity-30"
                >
                  <span className="material-symbols-rounded text-[20px]">keyboard_arrow_down</span>
                </button>
              </div>
              <span className="grid h-9.5 w-9.5 flex-none place-items-center rounded-lg bg-(--color-primary-soft) text-(--color-primary-ink)">
                <span className="material-symbols-rounded text-[20px]">{meta.icon}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{meta.name}</div>
                <div className="text-xs text-(--color-muted)">{meta.desc}</div>
              </div>
              <Switch checked={m.on} onChange={() => toggle(i)} />
            </div>
          )
        })}
      </section>
    </div>
  )
}
