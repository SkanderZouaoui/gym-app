import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { membersApi } from '../api/endpoints'
import { useSessionStore } from '../store/session'
import { MemberMembershipPanel } from '../components/MemberMembershipPanel'

export function MembersPage() {
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const activeBranchId = useSessionStore((s) => s.activeBranchId)
  const queryClient = useQueryClient()

  const { data: members, isFetching } = useQuery({
    queryKey: ['members', 'search', query, activeBranchId],
    queryFn: () => membersApi.search(query, activeBranchId ?? undefined),
  })

  const suspend = useMutation({
    mutationFn: membersApi.suspend,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', 'search'] }),
  })
  const reactivate = useMutation({
    mutationFn: membersApi.reactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', 'search'] }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Adhérents</h1>
          <p className="text-sm text-(--color-muted)">Recherche, suspension, réactivation</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-(--color-muted)">
          search
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, téléphone ou email"
          className="h-11 w-full rounded-lg border border-(--color-border) bg-(--color-surface-2) pl-10 pr-3 text-sm outline-none focus:border-(--color-primary)"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => (
              <Fragment key={m.id}>
                <tr
                  onClick={() => setExpandedId((id) => (id === m.id ? null : m.id))}
                  className="cursor-pointer border-b border-(--color-border) last:border-0 hover:bg-(--color-surface-2)"
                >
                  <td className="px-4 py-3 font-semibold">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="px-4 py-3 text-(--color-muted)">{m.phone ?? m.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        m.status === 'ACTIVE'
                          ? 'bg-(--color-success-soft) text-(--color-success-ink)'
                          : 'bg-(--color-warning-soft) text-(--color-warning-ink)'
                      }`}
                    >
                      {m.status === 'ACTIVE' ? 'Actif' : m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {m.status === 'ACTIVE' ? (
                      <button
                        onClick={() => suspend.mutate(m.id)}
                        className="rounded-md border border-(--color-border-strong) px-3 py-1.5 text-xs font-bold hover:bg-(--color-danger-soft) hover:text-(--color-danger-ink)"
                      >
                        Suspendre
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivate.mutate(m.id)}
                        className="rounded-md border border-(--color-border-strong) px-3 py-1.5 text-xs font-bold hover:bg-(--color-success-soft) hover:text-(--color-success-ink)"
                      >
                        Réactiver
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === m.id ? (
                  <tr className="border-b border-(--color-border) last:border-0">
                    <td colSpan={4} className="bg-(--color-surface-2) px-4 py-4">
                      <MemberMembershipPanel userId={m.id} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {!members || members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-(--color-muted)">
                  {isFetching ? 'Chargement…' : 'Aucun résultat'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
