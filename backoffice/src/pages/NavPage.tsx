import { useAppConfigDraft } from '../store/useAppConfigDraft'
import { Switch } from '../components/ui/Switch'

export function NavPage() {
  const { draft, patch } = useAppConfigDraft()
  const tabs = draft?.tabs
  const branding = draft?.branding

  if (!tabs || !branding) return <p className="text-sm text-(--color-muted)">Chargement…</p>

  const tabsOn = tabs.filter((t) => t.on).length

  const toggle = (i: number) => {
    const t = tabs[i]
    if (t.id === 'home' || t.id === 'training' || t.id === 'profile') return // onglets requis
    const next = tabs.map((x, j) => (j === i ? { ...x, on: !x.on } : x))
    patch({ tabs: next, changeLabel: `Onglet « ${t.fr} » ${t.on ? 'retiré' : 'ajouté'}` })
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= tabs.length) return
    const next = [...tabs]
    ;[next[i], next[j]] = [next[j], next[i]]
    patch({ tabs: next, changeLabel: "Ordre des onglets" })
  }

  const setLabel = (i: number, key: 'fr' | 'ar', value: string) => {
    const next = tabs.map((x, j) => (j === i ? { ...x, [key]: value } : x))
    patch({ tabs: next, changeLabel: `Libellé d'onglet « ${tabs[i].fr} »` })
  }

  const toggleQrCenter = () =>
    patch({ branding: { ...branding, qrCenter: !branding.qrCenter }, changeLabel: 'Bouton QR central' })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Navigation</h1>
        <p className="text-sm text-(--color-muted)">
          Onglets de la barre inférieure, leur ordre et leurs libellés.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border) px-5 py-4">
          <div>
            <div className="font-head text-[15px] font-bold">Barre d’onglets adhérent</div>
            <div className="text-[13px] text-(--color-muted)">
              Accueil, Entraînement et Profil sont requis. Planning peut être retiré (salle sans cours collectifs).
            </div>
          </div>
          <span className="rounded-full bg-(--color-success-soft) px-2.5 py-1 text-xs font-bold text-(--color-success-ink)">
            {tabsOn} onglet(s) actif(s)
          </span>
        </div>
        {tabs.map((t, i) => {
          const required = t.id === 'home' || t.id === 'training' || t.id === 'profile'
          return (
            <div
              key={t.id}
              className="grid grid-cols-[auto_38px_1fr_1fr_auto] items-center gap-3 border-b border-(--color-border) px-5 py-2.5 last:border-0"
              style={{ opacity: t.on ? 1 : 0.6 }}
            >
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" className="h-5 w-7 text-(--color-muted) disabled:opacity-30">
                  <span className="material-symbols-rounded text-[20px]">keyboard_arrow_up</span>
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === tabs.length - 1}
                  aria-label="Descendre"
                  className="h-5 w-7 text-(--color-muted) disabled:opacity-30"
                >
                  <span className="material-symbols-rounded text-[20px]">keyboard_arrow_down</span>
                </button>
              </div>
              <span className="grid h-9.5 w-9.5 place-items-center rounded-lg bg-(--color-surface-2)">
                <span className="material-symbols-rounded text-[20px]">{t.icon}</span>
              </span>
              <input
                value={t.fr}
                onChange={(e) => setLabel(i, 'fr', e.target.value)}
                aria-label="Libellé FR"
                className="h-9 min-w-0 rounded-lg border border-(--color-border-strong) px-2.5 text-[13.5px] outline-none focus:border-(--color-primary)"
              />
              <input
                value={t.ar}
                onChange={(e) => setLabel(i, 'ar', e.target.value)}
                dir="rtl"
                aria-label="Libellé AR"
                className="h-9 min-w-0 rounded-lg border border-(--color-border-strong) px-2.5 text-[13.5px] outline-none focus:border-(--color-primary)"
              />
              <Switch checked={t.on} onChange={() => toggle(i)} disabled={required} />
            </div>
          )
        })}
      </section>

      <section className="flex items-center gap-3.5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
        <span className="grid h-9.5 w-9.5 flex-none place-items-center rounded-full bg-(--color-primary) text-(--color-primary-contrast)">
          <span className="material-symbols-rounded text-[22px]">qr_code_scanner</span>
        </span>
        <div className="flex-1">
          <div className="text-sm font-bold">Bouton QR central</div>
          <div className="text-[12.5px] text-(--color-muted)">
            Accès direct au code d’entrée, au centre de la barre.
          </div>
        </div>
        <Switch checked={branding.qrCenter} onChange={toggleQrCenter} />
      </section>
    </div>
  )
}
