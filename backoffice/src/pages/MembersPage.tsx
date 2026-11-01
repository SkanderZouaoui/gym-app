import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMembers } from '../api/hooks'
import { useDebounce } from '../lib/hooks'
import { formatDate } from '../lib/format'
import { membershipBadge, membershipState, type MembershipState } from '../lib/membership'
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Icon, PageHeader, SearchInput, Skeleton, Tabs } from '../components/ui'
import { MemberDrawer } from '../components/domain/MemberDrawer'
import { CreateMemberModal } from '../components/domain/CreateMemberModal'
import { SellModal } from '../components/domain/SellModal'

type Filter = 'all' | MembershipState

export function MembersPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)
  const [selling, setSelling] = useState(false)
  const debounced = useDebounce(query.trim(), 300)
  const { members, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useMembers(debounced)
  const selected = params.get('id')
  const sentinel = useRef<HTMLDivElement>(null)

  // Défilement infini : la page suivante se charge quand le bas de la liste devient visible.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && !isFetchingNextPage && void fetchNextPage(), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: members.length, active: 0, expiring: 0, expired: 0, none: 0 }
    for (const m of members) c[membershipState(m)]++
    return c
  }, [members])
  const shown = filter === 'all' ? members : members.filter((m) => membershipState(m) === filter)

  const open = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('id', id)
    else next.delete('id')
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adhérents"
        subtitle="Rechercher, consulter et créer un compte."
        actions={
          <>
            <Button variant="outline" icon="payments" onClick={() => setSelling(true)}>Nouvelle vente</Button>
            <Button icon="person_add" onClick={() => setCreating(true)}>Nouvel adhérent</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Nom, téléphone, e-mail ou code…" />
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tous', count: counts.all },
            { value: 'active', label: 'Actifs', count: counts.active },
            { value: 'expiring', label: 'Expirent bientôt', count: counts.expiring },
            { value: 'expired', label: 'Expirés', count: counts.expired },
            { value: 'none', label: 'Sans abonnement', count: counts.none },
          ]}
        />
        {isFetching && !isLoading ? <Icon name="progress_activity" size={20} className="animate-spin text-muted" /> : null}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-px p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="my-2 h-12" />)}</div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : shown.length === 0 ? (
          <EmptyState icon="person_search" title="Aucun adhérent ne correspond" hint={query ? 'Essayez un autre nom, numéro ou e-mail.' : 'Aucun adhérent dans cette catégorie.'} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-[11.5px] font-bold uppercase tracking-wider text-muted">
                <th className="px-5 py-3">Adhérent</th>
                <th className="hidden px-4 py-3 md:table-cell">Contact</th>
                <th className="hidden px-4 py-3 lg:table-cell">Formule</th>
                <th className="px-4 py-3">Statut</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => {
                const badge = membershipBadge(m)
                const last = m.memberships?.[0]
                return (
                  <tr key={m.id} onClick={() => open(m.id)} className="cursor-pointer border-b border-border transition last:border-0 hover:bg-primary-soft/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={m.firstName} lastName={m.lastName} photoUrl={m.photoUrl} size={40} />
                        <div className="min-w-0">
                          <div className="truncate font-bold">{m.firstName} {m.lastName}</div>
                          {m.memberCode ? <div className="text-xs text-muted">Code {m.memberCode}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">
                      <div className="truncate">{m.phone ?? '—'}</div>
                      <div className="max-w-56 truncate text-xs">{m.email ?? ''}</div>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {last ? (
                        <>
                          <div className="font-semibold">{last.plan.name}</div>
                          <div className="text-xs text-muted">jusqu’au {formatDate(last.endDate)}</div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge tone={badge.tone} dot>{badge.label}</Badge></td>
                    <td className="pr-4 text-muted"><Icon name="chevron_right" size={20} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div ref={sentinel} />
        {isFetchingNextPage ? <div className="border-t border-border p-4 text-center text-sm text-muted">Chargement…</div> : null}
      </Card>
      {filter !== 'all' && hasNextPage ? <p className="text-center text-xs text-muted">Les filtres portent sur les adhérents déjà chargés — faites défiler pour en charger d’autres.</p> : null}

      {selected ? <MemberDrawer id={selected} onClose={() => open(null)} /> : null}
      {creating ? <CreateMemberModal onClose={() => setCreating(false)} /> : null}
      {selling ? <SellModal onClose={() => setSelling(false)} /> : null}
    </div>
  )
}
