import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { exercisesApi, type ExerciseItem } from '../api/endpoints'
import { ExerciseDrawer } from '../components/ExerciseDrawer'
import { Pagination } from '../components/ui/Pagination'
import { usePagination } from '../lib/usePagination'

const TYPES: ExerciseItem['type'][] = ['STRENGTH', 'CARDIO', 'MOBILITY']
const TYPE_LABELS: Record<ExerciseItem['type'], string> = { STRENGTH: 'Force', CARDIO: 'Cardio', MOBILITY: 'Mobilité' }
const TYPE_ICON: Record<ExerciseItem['type'], string> = { STRENGTH: 'fitness_center', CARDIO: 'directions_run', MOBILITY: 'self_improvement' }
const TYPE_TONE: Record<ExerciseItem['type'], string> = { STRENGTH: 'primary', CARDIO: 'danger', MOBILITY: 'info' }
const MUSCLE_OPTS = ['Tous les muscles', 'Jambes', 'Pectoraux', 'Dos', 'Ischios', 'Fessiers', 'Épaules', 'Abdominaux', 'Hanches', 'Corps entier']

export function ExercisesPage() {
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('Tous les muscles')
  const [typeFilter, setTypeFilter] = useState<ExerciseItem['type'] | 'Tous'>('Tous')
  const [drawer, setDrawer] = useState<{ item: ExerciseItem | null } | null>(null)

  const { data: exercises } = useQuery({
    queryKey: ['exercises', 'admin', search],
    queryFn: () => exercisesApi.findAllForAdmin({ search: search || undefined }),
  })

  const byMuscle = (exercises ?? []).filter((e) => muscle === 'Tous les muscles' || e.muscleGroup === muscle)
  const filtered = byMuscle.filter((e) => typeFilter === 'Tous' || e.type === typeFilter)
  const { page, pageCount, pageItems, setPage, totalItems, pageSize } = usePagination(filtered)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 max-w-90 flex-1">
          <span className="material-symbols-rounded absolute left-2.5 top-1/2 -translate-y-1/2 text-[20px] text-(--color-muted)">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un exercice…"
            className="h-10 w-full rounded-lg border border-(--color-border) bg-(--color-surface) pl-9 pr-3 text-[13.5px] outline-none focus:border-(--color-primary)"
          />
        </div>
        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
          aria-label="Groupe musculaire"
          className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-[13.5px]"
        >
          {MUSCLE_OPTS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setDrawer({ item: null })}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-(--color-primary) px-3.5 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover)"
        >
          <span className="material-symbols-rounded text-[18px]">add</span>
          Nouvel exercice
        </button>
      </div>

      <div className="flex gap-1.5">
        {(['Tous', ...TYPES] as const).map((t) => {
          const count = t === 'Tous' ? byMuscle.length : byMuscle.filter((e) => e.type === t).length
          const active = t === typeFilter
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`h-8 rounded-full border px-3 text-[13px] font-semibold ${
                active ? 'border-(--color-secondary) bg-(--color-secondary) text-white' : 'border-(--color-border) bg-(--color-surface)'
              }`}
            >
              {t === 'Tous' ? 'Tous' : TYPE_LABELS[t]} · {count}
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="grid grid-cols-[2fr_130px_140px_120px_70px] gap-3 bg-(--color-surface-2) px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-(--color-muted)">
          <span>Exercice · {filtered.length}</span>
          <span>Muscle</span>
          <span>Matériel</span>
          <span>Niveau</span>
          <span>Vidéo</span>
        </div>
        {pageItems.map((e) => (
          <button
            key={e.id}
            onClick={() => setDrawer({ item: e })}
            className="grid w-full grid-cols-[2fr_130px_140px_120px_70px] items-center gap-3 border-b border-(--color-border) px-5 py-2.5 text-start text-[13.5px] last:border-0 hover:bg-(--color-surface-2)"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span
                className="grid h-9 w-9 flex-none place-items-center rounded-lg"
                style={{ background: `var(--color-${TYPE_TONE[e.type]}-soft)`, color: `var(--color-${TYPE_TONE[e.type]}-ink)` }}
              >
                <span className="material-symbols-rounded text-[18px]">{TYPE_ICON[e.type]}</span>
              </span>
              <div className="min-w-0">
                <div className="truncate font-bold">{e.name}</div>
                <div className="text-xs text-(--color-muted)">{TYPE_LABELS[e.type]}</div>
              </div>
            </div>
            <span>{e.muscleGroup ?? '—'}</span>
            <span className="text-(--color-muted)">{e.equipment ?? '—'}</span>
            <span>{e.level ?? '—'}</span>
            <span
              className="material-symbols-rounded text-[20px]"
              style={{ color: e.mediaKey ? 'var(--color-primary-ink)' : 'var(--color-muted)' }}
            >
              {e.mediaKey ? 'play_circle' : 'remove'}
            </span>
          </button>
        ))}
        {filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13.5px] text-(--color-muted)">Aucun exercice ne correspond.</div>
        ) : null}
        <Pagination page={page} pageCount={pageCount} onChange={setPage} totalItems={totalItems} pageSize={pageSize} />
      </div>

      {drawer ? <ExerciseDrawer item={drawer.item} onClose={() => setDrawer(null)} /> : null}
    </div>
  )
}
