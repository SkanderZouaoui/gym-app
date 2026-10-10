import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appConfigApi } from '../api/endpoints'
import { useAppConfigDraft } from '../store/useAppConfigDraft'
import { Pagination } from '../components/ui/Pagination'
import { usePagination } from '../lib/usePagination'

export function PublishPage() {
  const queryClient = useQueryClient()
  const { draft, changeCount } = useAppConfigDraft()
  const { data: history } = useQuery({ queryKey: ['app-config', 'history'], queryFn: appConfigApi.history })
  const { page, pageCount, pageItems, setPage, totalItems, pageSize } = usePagination(history ?? [])

  const discard = useMutation({
    mutationFn: appConfigApi.discardDraft,
    onSuccess: (updated) => queryClient.setQueryData(['app-config', 'draft'], updated),
  })

  const restore = useMutation({
    mutationFn: (versionId: string) => appConfigApi.restore(versionId),
    onSuccess: (updated) => queryClient.setQueryData(['app-config', 'draft'], updated),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Publication</h1>
        <p className="text-sm text-(--color-muted)">
          Relisez le brouillon, publiez une version ou revenez à une version précédente.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border) px-5 py-4">
          <div>
            <div className="font-head text-[15px] font-bold">Modifications en attente</div>
            <div className="text-[13px] text-(--color-muted)">
              Appliquées sans mise à jour store, au prochain lancement de l'app.
            </div>
          </div>
          <button
            onClick={() => discard.mutate()}
            disabled={changeCount === 0 || discard.isPending}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3.5 text-[13.5px] font-bold hover:bg-(--color-surface-2) disabled:opacity-50"
          >
            Tout annuler
          </button>
        </div>

        {changeCount === 0 ? (
          <div className="px-5 py-8 text-center text-[13.5px] text-(--color-muted)">
            Aucune modification. Le brouillon est identique à la version en ligne.
          </div>
        ) : (
          (draft?.changedKeys ?? []).map((c) => (
            <div key={c} className="flex items-center gap-3 border-b border-(--color-border) px-5 py-3 last:border-0">
              <span className="h-2 w-2 flex-none rounded-full bg-(--color-warning)" />
              <span className="flex-1 text-sm font-semibold">{c}</span>
            </div>
          ))
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="border-b border-(--color-border) px-5 py-4 font-head text-[15px] font-bold">
          Historique des versions
        </div>
        {(history ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center text-[13.5px] text-(--color-muted)">
            Aucune version publiée pour le moment.
          </div>
        ) : (
          pageItems.map((h) => (
            <div key={h.id} className="flex items-center gap-3.5 border-b border-(--color-border) px-5 py-3 last:border-0">
              <span className="rounded-md bg-(--color-surface-2) px-2 py-0.5 font-mono text-xs font-semibold">
                v{h.versionNumber}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{h.note}</div>
                <div className="text-xs text-(--color-muted)">
                  {new Date(h.publishedAt ?? h.createdAt).toLocaleString('fr-FR')}
                  {h.publishedBy ? ` · ${h.publishedBy.firstName} ${h.publishedBy.lastName}` : ''}
                </div>
              </div>
              {h.id === history![0].id ? (
                <span className="rounded-full bg-(--color-success-soft) px-2.5 py-1 text-xs font-bold text-(--color-success-ink)">
                  En ligne
                </span>
              ) : (
                <button
                  onClick={() => restore.mutate(h.id)}
                  disabled={restore.isPending}
                  className="h-8 rounded-md border border-(--color-border-strong) px-3 text-xs font-bold hover:bg-(--color-surface-2) disabled:opacity-50"
                >
                  Restaurer
                </button>
              )}
            </div>
          ))
        )}
        <Pagination page={page} pageCount={pageCount} onChange={setPage} totalItems={totalItems} pageSize={pageSize} />
      </section>
    </div>
  )
}
