export function Pagination({
  page,
  pageCount,
  onChange,
  totalItems,
  pageSize,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
  totalItems: number
  pageSize: number
}) {
  if (pageCount <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--color-border) px-5 py-3">
      <span className="text-xs text-(--color-muted)">
        {from}–{to} sur {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Page précédente"
          className="grid h-8 w-8 place-items-center rounded-md border border-(--color-border-strong) hover:bg-(--color-surface-2) disabled:opacity-40"
        >
          <span className="material-symbols-rounded text-[18px]">chevron_left</span>
        </button>
        <span className="min-w-16 text-center text-xs font-bold">
          {page} / {pageCount}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Page suivante"
          className="grid h-8 w-8 place-items-center rounded-md border border-(--color-border-strong) hover:bg-(--color-surface-2) disabled:opacity-40"
        >
          <span className="material-symbols-rounded text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  )
}
