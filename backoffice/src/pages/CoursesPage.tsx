import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { classTypesApi, type ClassTypeItem, type CreateClassTypeInput } from '../api/endpoints'
import { Switch } from '../components/ui/Switch'
import { ClassTypeDrawer } from '../components/ClassTypeDrawer'
import { Pagination } from '../components/ui/Pagination'
import { usePagination } from '../lib/usePagination'

export function CoursesPage() {
  const queryClient = useQueryClient()
  const { data: types } = useQuery({ queryKey: ['class-types', 'admin'], queryFn: classTypesApi.findAllForAdmin })
  const { page, pageCount, pageItems, setPage, totalItems, pageSize } = usePagination(types ?? [], 9)
  const [drawer, setDrawer] = useState<{ item: ClassTypeItem | null } | null>(null)

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateClassTypeInput> }) => classTypesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-types'] }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Catalogue de cours</h1>
          <p className="text-sm text-(--color-muted)">
            Les cours réservables apparaissent dans le planning et dans l’app.
          </p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setDrawer({ item: null })}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-(--color-primary) px-3.5 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover)"
        >
          <span className="material-symbols-rounded text-[18px]">add</span>
          Nouveau cours
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-3.5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4.5"
            style={{ opacity: c.isBookable ? 1 : 0.65 }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 flex-none place-items-center rounded-lg"
                style={{ background: `var(--color-${c.tone}-soft)`, color: `var(--color-${c.tone}-ink)` }}
              >
                <span className="material-symbols-rounded text-[24px]">{c.icon}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-head text-base font-bold">{c.name}</div>
                <div className="text-xs text-(--color-muted)">
                  {c.defaultDurationMin} min · {c.level ?? 'Tous niveaux'}
                </div>
              </div>
              <button
                onClick={() => setDrawer({ item: c })}
                aria-label="Modifier"
                className="grid h-8 w-8 flex-none place-items-center rounded-md border border-(--color-border) hover:bg-(--color-surface-2)"
              >
                <span className="material-symbols-rounded text-[18px]">edit</span>
              </button>
              <Switch
                checked={c.isBookable}
                onChange={() => update.mutate({ id: c.id, data: { isBookable: !c.isBookable } })}
              />
            </div>
            <div className="flex items-center justify-between border-t border-(--color-border) pt-3">
              <span className="text-[13px] font-semibold">Capacité</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => update.mutate({ id: c.id, data: { defaultCapacity: Math.max(1, c.defaultCapacity - 1) } })}
                  className="grid h-8 w-8 place-items-center rounded-md border border-(--color-border-strong) hover:bg-(--color-surface-2)"
                >
                  <span className="material-symbols-rounded text-[18px]">remove</span>
                </button>
                <span className="w-10 text-center font-head text-base font-bold">{c.defaultCapacity}</span>
                <button
                  onClick={() => update.mutate({ id: c.id, data: { defaultCapacity: Math.min(99, c.defaultCapacity + 1) } })}
                  className="grid h-8 w-8 place-items-center rounded-md border border-(--color-border-strong) hover:bg-(--color-surface-2)"
                >
                  <span className="material-symbols-rounded text-[18px]">add</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <Pagination page={page} pageCount={pageCount} onChange={setPage} totalItems={totalItems} pageSize={pageSize} />
      </div>

      {drawer ? <ClassTypeDrawer item={drawer.item} onClose={() => setDrawer(null)} /> : null}
    </div>
  )
}
