import { BRAND_PRESETS, FONT_PAIRS, contrastRatio, bestOnColor, type Branding } from '@muscleup/shared'
import { useAppConfigDraft } from '../store/useAppConfigDraft'
import { Segmented } from '../components/ui/Segmented'

const FONT_LABELS: Branding['font'][] = ['Géométrique', 'Sportive', 'Expressive']

export function BrandPage() {
  const { draft, patch } = useAppConfigDraft()
  const branding = draft?.branding

  if (!branding) return <p className="text-sm text-(--color-muted)">Chargement…</p>

  const setBrand = (patchValue: Partial<Branding>, label: string) =>
    patch({ branding: { ...branding, ...patchValue }, changeLabel: label })

  const ratio = contrastRatio(branding.primaryContrast, branding.primary)
  const ok = ratio >= 4.5
  const mono = (branding.brand || 'MU').trim().slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Identité visuelle</h1>
        <p className="text-sm text-(--color-muted)">
          Nom, logo, couleurs, typographie et style. Tous les écrans adhérent, coach et staff en héritent.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
        <div>
          <div className="font-head text-[15px] font-bold">Nom &amp; logo</div>
          <div className="text-[13px] text-(--color-muted)">
            Le changement de nom ou d'icône d'app nécessite une nouvelle build store.
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-24 w-24 flex-none place-items-center rounded-2xl border-[1.5px] border-dashed border-(--color-border-strong) bg-(--color-surface-2)">
            <div
              className="grid h-14 w-14 place-items-center rounded-lg font-head text-lg font-extrabold"
              style={{ background: branding.primary, color: branding.primaryContrast }}
            >
              {mono}
            </div>
          </div>
          <div className="flex min-w-60 flex-1 flex-col gap-2.5">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Nom de la salle
              <input
                value={branding.brand}
                onChange={(e) => setBrand({ brand: e.target.value }, 'Nom de la salle')}
                className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm font-medium outline-none focus:border-(--color-primary)"
              />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Position du logo</span>
            <Segmented
              options={['Gauche', 'Centré']}
              value={branding.logoPos}
              onChange={(v) => setBrand({ logoPos: v as Branding['logoPos'] }, 'Position du logo')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Affichage</span>
            <Segmented
              options={['Logo + nom', 'Logo seul']}
              value={branding.logoMode}
              onChange={(v) => setBrand({ logoMode: v as Branding['logoMode'] }, 'Affichage du logo')}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
        <div>
          <div className="font-head text-[15px] font-bold">Palette</div>
          <div className="text-[13px] text-(--color-muted)">
            Les teintes claires, survols et encres sont dérivées automatiquement.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Object.entries(BRAND_PRESETS).map(([name, p]) => {
            const active = p.primary === branding.primary && p.secondary === branding.secondary
            return (
              <button
                key={name}
                onClick={() => setBrand(p, `Palette « ${name} »`)}
                className={`flex flex-col gap-2 rounded-lg p-2.5 text-start hover:bg-(--color-surface-2) ${
                  active ? 'border-2 border-(--color-primary)' : 'border border-(--color-border)'
                }`}
              >
                <div className="flex h-7 overflow-hidden rounded-md">
                  <span className="flex-[2]" style={{ background: p.primary }} />
                  <span className="flex-1" style={{ background: p.secondary }} />
                  <span className="flex-1" style={{ background: p.accent }} />
                </div>
                <span className="text-[13px] font-bold">{name}</span>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {(
            [
              ['primary', 'Primaire', 'Boutons, liens, actifs'],
              ['primaryContrast', 'Texte sur primaire', 'Lisibilité des boutons'],
              ['secondary', 'Secondaire', 'Cartes sombres, en-têtes'],
              ['accent', 'Accent', 'Badges, défis'],
            ] as const
          ).map(([key, label, desc]) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-lg border border-(--color-border) px-3 py-2.5"
            >
              <input
                type="color"
                value={branding[key]}
                onChange={(e) => setBrand({ [key]: e.target.value.toUpperCase() } as Partial<Branding>, `Couleur : ${label.toLowerCase()}`)}
                className="h-10 w-10 flex-none cursor-pointer rounded-md border border-(--color-border) p-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold">{label}</div>
                <div className="text-xs text-(--color-muted)">{desc}</div>
              </div>
              <span className="font-mono text-xs text-(--color-muted)">{branding[key]}</span>
            </label>
          ))}
        </div>
        <div
          className={`flex items-center gap-3 rounded-lg p-3 text-[13px] ${
            ok ? 'bg-(--color-success-soft) text-(--color-success-ink)' : 'bg-(--color-danger-soft) text-(--color-danger-ink)'
          }`}
        >
          <span className="material-symbols-rounded text-[20px]">{ok ? 'check_circle' : 'error'}</span>
          <span className="flex-1">
            <b>Bouton primaire : {ratio.toFixed(2)}:1</b> ·{' '}
            {ok ? 'conforme WCAG AA.' : "sous le seuil AA (4,5:1)."}
          </span>
          {!ok ? (
            <button
              onClick={() => setBrand({ primaryContrast: bestOnColor(branding.primary) }, 'Couleur : texte sur primaire')}
              className="h-7.5 rounded-md bg-(--color-danger) px-3 text-xs font-bold text-white"
            >
              Corriger
            </button>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-4.5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
        <div className="font-head text-[15px] font-bold">Style</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Thème par défaut</span>
            <Segmented
              options={['Clair', 'Sombre', 'Auto']}
              value={branding.theme}
              onChange={(v) => setBrand({ theme: v as Branding['theme'] }, 'Thème par défaut')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Densité</span>
            <Segmented
              options={['Confortable', 'Compacte']}
              value={branding.density}
              onChange={(v) => setBrand({ density: v as Branding['density'] }, 'Densité')}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            <span className="flex justify-between">
              Arrondi des angles
              <span className="font-mono font-medium text-(--color-muted)">{branding.radius} px</span>
            </span>
            <input
              type="range"
              min={4}
              max={24}
              step={1}
              value={branding.radius}
              onChange={(e) => setBrand({ radius: Number(e.target.value) }, 'Arrondi des angles')}
            />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Typographie</span>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {FONT_LABELS.map((label) => {
              const pair = FONT_PAIRS[label]
              const active = branding.font === label
              return (
                <button
                  key={label}
                  onClick={() => setBrand({ font: label }, `Typographie ${label}`)}
                  className={`flex flex-col gap-1 rounded-lg p-3.5 text-start hover:bg-(--color-surface-2) ${
                    active ? 'border-2 border-(--color-primary)' : 'border border-(--color-border)'
                  }`}
                >
                  <span className="font-head text-[26px] font-extrabold leading-none tracking-tight">Aa</span>
                  <span className="text-[13px] font-bold">{label}</span>
                  <span className="text-xs text-(--color-muted)">{pair.join(' + ')}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
