import { Icon } from './Icon'

export function Pagination({ page, pageCount, onChange, total, pageSize }: { page: number; pageCount: number; onChange: (p: number) => void; total: number; pageSize: number }) {
  if (total <= pageSize) return null
  const from = page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  const btn = 'grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-transparent'
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
      <span className="text-muted">{from}–{to} sur {total}</span>
      <div className="flex items-center gap-1">
        <button className={btn} disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Page précédente"><Icon name="chevron_left" size={22} /></button>
        <span className="min-w-16 text-center font-bold">{page + 1} / {pageCount}</span>
        <button className={btn} disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)} aria-label="Page suivante"><Icon name="chevron_right" size={22} /></button>
      </div>
    </div>
  )
}
