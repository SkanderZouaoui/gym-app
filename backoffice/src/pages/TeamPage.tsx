import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Role } from '@muscleup/shared'
import { teamApi, type TeamMemberItem } from '../api/endpoints'
import { Pagination } from '../components/ui/Pagination'
import { usePagination } from '../lib/usePagination'
import { TeamDrawer } from '../components/TeamDrawer'
import { UserAvatar } from '../components/ui/UserAvatar'

const STATUS_TONE: Record<string, string> = { ACTIVE: 'success', SUSPENDED: 'danger' }
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Actif', SUSPENDED: 'Suspendu' }

function roleLabel(roles: { role: Role }[]) {
  return roles.some((r) => r.role === 'ADMIN') ? 'Admin' : 'Accueil'
}

export function TeamPage() {
  const { data: team } = useQuery({ queryKey: ['team'], queryFn: teamApi.findAll })
  const [roleFilter, setRoleFilter] = useState<'Tous' | 'ADMIN' | 'STAFF'>('Tous')
  const [drawer, setDrawer] = useState<{ item: TeamMemberItem | null } | null>(null)

  const filtered = (team ?? []).filter(
    (t) => roleFilter === 'Tous' || t.roles.some((r) => r.role === roleFilter),
  )
  const { page, pageCount, pageItems, setPage, totalItems, pageSize } = usePagination(filtered)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Équipe</h1>
          <p className="text-sm text-(--color-muted)">Comptes internes — Accueil et Admin</p>
        </div>
        <button
          onClick={() => setDrawer({ item: null })}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-(--color-primary) px-3.5 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover)"
        >
          <span className="material-symbols-rounded text-[18px]">person_add</span>
          Nouveau compte
        </button>
      </div>

      <div className="flex gap-1.5">
        {(['Tous', 'ADMIN', 'STAFF'] as const).map((r) => {
          const count = r === 'Tous' ? (team ?? []).length : (team ?? []).filter((t) => t.roles.some((x) => x.role === r)).length
          const active = r === roleFilter
          return (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`h-8 rounded-full border px-3 text-[13px] font-semibold ${
                active ? 'border-(--color-secondary) bg-(--color-secondary) text-white' : 'border-(--color-border) bg-(--color-surface)'
              }`}
            >
              {r === 'Tous' ? 'Tous' : r === 'ADMIN' ? 'Admin' : 'Accueil'} · {count}
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((t) => (
              <tr
                key={t.id}
                onClick={() => setDrawer({ item: t })}
                className="cursor-pointer border-b border-(--color-border) last:border-0 hover:bg-(--color-surface-2)"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar firstName={t.firstName} lastName={t.lastName} photoUrl={t.photoUrl} />
                    <span className="font-semibold">
                      {t.firstName} {t.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-(--color-muted)">{t.phone ?? t.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-(--color-info-soft) px-2.5 py-1 text-xs font-bold text-(--color-info-ink)">
                    {roleLabel(t.roles)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ background: `var(--color-${STATUS_TONE[t.status]}-soft)`, color: `var(--color-${STATUS_TONE[t.status]}-ink)` }}
                  >
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-(--color-muted)">
                  Aucun compte.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Pagination page={page} pageCount={pageCount} onChange={setPage} totalItems={totalItems} pageSize={pageSize} />
      </div>

      {drawer ? <TeamDrawer item={drawer.item} onClose={() => setDrawer(null)} /> : null}
    </div>
  )
}
