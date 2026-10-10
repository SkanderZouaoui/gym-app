import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { coachesApi, type CoachListItem } from '../api/endpoints'
import { CoachDrawer } from '../components/CoachDrawer'
import { Pagination } from '../components/ui/Pagination'
import { usePagination } from '../lib/usePagination'

const STATUS_LABEL: Record<CoachListItem['status'], string> = { ACTIVE: 'Actif', ON_LEAVE: 'En congé', INACTIVE: 'Inactif' }
const STATUS_TONE: Record<CoachListItem['status'], string> = { ACTIVE: 'success', ON_LEAVE: 'warning', INACTIVE: 'danger' }

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export function CoachesPage() {
  const { data: coaches } = useQuery({ queryKey: ['coaches'], queryFn: coachesApi.findAll })
  const { page, pageCount, pageItems, setPage, totalItems, pageSize } = usePagination(coaches ?? [], 9)
  const [drawer, setDrawer] = useState<{ item: CoachListItem | null } | null>(null)

  const activeCount = (coaches ?? []).filter((c) => c.status === 'ACTIVE').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13.5px] text-(--color-muted)">
          {(coaches ?? []).length} coachs · {activeCount} actifs
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setDrawer({ item: null })}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-(--color-primary) px-3.5 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover)"
        >
          <span className="material-symbols-rounded text-[18px]">person_add</span>
          Nouveau coach
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((c) => (
          <button
            key={c.userId}
            onClick={() => setDrawer({ item: c })}
            className="flex flex-col gap-3.5 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4.5 text-start hover:border-(--color-border-strong)"
          >
            <div className="flex w-full items-center gap-3">
              <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-(--color-secondary) font-head text-[15px] font-bold text-white">
                {initials(c.user.firstName, c.user.lastName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-head text-base font-bold">
                  {c.user.firstName} {c.user.lastName}
                </div>
                <div className="truncate text-[12.5px] text-(--color-muted)">{c.specialties.join(', ') || '—'}</div>
              </div>
              <span
                className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ background: `var(--color-${STATUS_TONE[c.status]}-soft)`, color: `var(--color-${STATUS_TONE[c.status]}-ink)` }}
              >
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 border-t border-(--color-border) pt-3">
              <div>
                <div className="font-head text-lg font-extrabold">{c.weeklyClasses}</div>
                <div className="text-[11.5px] text-(--color-muted)">cours / sem.</div>
              </div>
              <div>
                <div className="font-head text-lg font-extrabold">{c.privateClientsCount}</div>
                <div className="text-[11.5px] text-(--color-muted)">clients privés</div>
              </div>
              <div>
                <div className="truncate font-head text-lg font-extrabold">
                  {c.sessionPrice ? `${Number(c.sessionPrice)} DT` : '—'}
                </div>
                <div className="text-[11.5px] text-(--color-muted)">coaching privé</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <Pagination page={page} pageCount={pageCount} onChange={setPage} totalItems={totalItems} pageSize={pageSize} />
      </div>

      {drawer ? <CoachDrawer item={drawer.item} onClose={() => setDrawer(null)} /> : null}
    </div>
  )
}
