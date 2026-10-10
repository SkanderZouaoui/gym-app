import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appConfigApi } from '../api/endpoints'

export function PublishDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')

  const { data: draft } = useQuery({ queryKey: ['app-config', 'draft'], queryFn: appConfigApi.getDraft })
  const { data: history } = useQuery({ queryKey: ['app-config', 'history'], queryFn: appConfigApi.history })

  const publish = useMutation({
    mutationFn: () => appConfigApi.publish(note.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-config'] })
      onClose()
    },
  })

  const nextVersion = `v${(history?.[0]?.versionNumber ?? 0) + 1}`
  const changes = draft?.changedKeys ?? []

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-(--color-surface) p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10.5 w-10.5 flex-none items-center justify-center rounded-lg bg-(--color-primary-soft) text-(--color-primary-ink)">
            <span className="material-symbols-rounded text-[22px]">rocket_launch</span>
          </span>
          <div>
            <div className="font-head text-[19px] font-extrabold tracking-tight">Publier {nextVersion}</div>
            <div className="text-[13.5px] text-(--color-muted)">
              {changes.length} modification(s) envoyée(s) à tous les adhérents, coachs et staff.
            </div>
          </div>
        </div>

        <div className="max-h-48 overflow-auto rounded-lg border border-(--color-border)">
          {changes.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-(--color-muted)">Aucune modification.</div>
          ) : (
            changes.map((c) => (
              <div
                key={c}
                className="flex justify-between gap-3 border-b border-(--color-border) px-3 py-2.5 text-[13.5px] last:border-0"
              >
                <span className="font-semibold">{c}</span>
              </div>
            ))
          )}
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Note de version
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. Nouvelle palette d'automne"
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
          />
        </label>

        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3.5 text-[13.5px] font-bold hover:bg-(--color-surface-2)"
          >
            Annuler
          </button>
          <button
            onClick={() => publish.mutate()}
            disabled={publish.isPending || changes.length === 0}
            className="h-10 rounded-lg bg-(--color-primary) px-4 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover) disabled:opacity-50"
          >
            {publish.isPending ? 'Publication…' : 'Publier maintenant'}
          </button>
        </div>
      </div>
    </div>
  )
}
