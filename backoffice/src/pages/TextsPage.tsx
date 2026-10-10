import { useState } from 'react'
import type { AppLanguages } from '@muscleup/shared'
import { useAppConfigDraft } from '../store/useAppConfigDraft'
import { Switch } from '../components/ui/Switch'
import { Pagination } from '../components/ui/Pagination'
import { usePagination } from '../lib/usePagination'

const LANG_META: Record<keyof AppLanguages, { name: string; locked?: boolean }> = {
  FR: { name: 'Français', locked: true },
  AR: { name: 'العربية' },
  EN: { name: 'English' },
}

export function TextsPage() {
  const { draft, patch } = useAppConfigDraft()
  const [query, setQuery] = useState('')
  const strings = draft?.strings
  const languages = draft?.languages

  const q = query.trim().toLowerCase()
  const filtered = (strings ?? []).filter(
    (s) => !q || `${s.k}${s.fr}${s.ar}${s.label}`.toLowerCase().includes(q),
  )
  const { page, pageCount, pageItems, setPage, totalItems, pageSize } = usePagination(filtered)

  if (!strings || !languages) return <p className="text-sm text-(--color-muted)">Chargement…</p>

  const arTotal = strings.length
  const arDone = strings.filter((s) => s.ar.trim()).length

  const toggleLang = (lang: keyof AppLanguages) => {
    if (lang === 'FR') return
    patch({
      languages: { ...languages, [lang]: !languages[lang] },
      changeLabel: `Langue ${LANG_META[lang].name} ${languages[lang] ? 'désactivée' : 'activée'}`,
    })
  }

  const setString = (k: string, field: 'fr' | 'ar', value: string) => {
    const next = strings.map((s) => (s.k === k ? { ...s, [field]: value } : s))
    patch({ strings: next, changeLabel: `Texte ${k} (${field.toUpperCase()})` })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Textes &amp; langues</h1>
        <p className="text-sm text-(--color-muted)">
          Tous les libellés de l’app, en français et en arabe (RTL).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(LANG_META) as (keyof AppLanguages)[]).map((lang) => {
          const meta = LANG_META[lang]
          const on = languages[lang]
          return (
            <div key={lang} className="flex items-center gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) p-3.5">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-(--color-surface-2) font-mono text-xs font-semibold">
                {lang}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{meta.name}</div>
                <div className="text-xs text-(--color-muted)">
                  {lang === 'AR' ? `${arDone}/${arTotal} textes traduits` : lang === 'FR' ? 'Langue par défaut' : on ? 'Activée · textes à traduire' : 'Désactivée'}
                </div>
              </div>
              <Switch checked={on} onChange={() => toggleLang(lang)} disabled={meta.locked} />
            </div>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="flex flex-wrap items-center gap-3 border-b border-(--color-border) px-5 py-3.5">
          <div className="relative min-w-60 flex-1">
            <span className="material-symbols-rounded absolute left-2.5 top-1/2 -translate-y-1/2 text-[20px] text-(--color-muted)">
              search
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une clé ou un texte…"
              className="h-10 w-full rounded-lg border border-(--color-border) bg-(--color-surface-2) pl-9 pr-3 text-[13.5px] outline-none focus:border-(--color-primary)"
            />
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              arDone === arTotal ? 'bg-(--color-success-soft) text-(--color-success-ink)' : 'bg-(--color-warning-soft) text-(--color-warning-ink)'
            }`}
          >
            AR : {arDone} / {arTotal} traduits
          </span>
        </div>
        <div className="grid grid-cols-[.8fr_1.2fr_1.2fr] gap-3 bg-(--color-surface-2) px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-(--color-muted)">
          <span>Clé</span>
          <span>Français</span>
          <span>العربية</span>
        </div>
        {pageItems.map((s) => (
          <div key={s.k} className="grid grid-cols-[.8fr_1.2fr_1.2fr] items-center gap-3 border-b border-(--color-border) px-5 py-2.5 last:border-0">
            <div className="min-w-0">
              <div className="truncate font-mono text-xs">{s.k}</div>
              <div className="text-xs text-(--color-muted)">{s.label}</div>
            </div>
            <input
              value={s.fr}
              onChange={(e) => setString(s.k, 'fr', e.target.value)}
              className="h-9 min-w-0 rounded-lg border border-(--color-border-strong) px-2.5 text-[13.5px] outline-none focus:border-(--color-primary)"
            />
            <input
              value={s.ar}
              onChange={(e) => setString(s.k, 'ar', e.target.value)}
              dir="rtl"
              placeholder="Non traduit · repli FR"
              className={`h-9 min-w-0 rounded-lg px-2.5 text-[13.5px] outline-none focus:border-(--color-primary) ${
                s.ar.trim() ? 'border border-(--color-border-strong)' : 'border border-(--color-warning-border) bg-(--color-warning-soft)'
              }`}
            />
          </div>
        ))}
        <Pagination page={page} pageCount={pageCount} onChange={setPage} totalItems={totalItems} pageSize={pageSize} />
      </section>
    </div>
  )
}
