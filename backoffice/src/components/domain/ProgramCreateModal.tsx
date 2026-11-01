import { useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { useCreateProgram, useExercises, type Exercise } from '../../api/content'
import { useDebounce } from '../../lib/hooks'
import { Button, Card, Field, Icon, IconButton, Modal, SearchInput, Skeleton, cn, useToast } from '../ui'

const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé']
const GOALS = [
  { value: 'Perte de poids', icon: 'local_fire_department', sub: 'Brûler des calories' },
  { value: 'Masse', icon: 'exercise', sub: 'Gagner du muscle' },
  { value: 'Endurance', icon: 'directions_run', sub: 'Tenir l’effort' },
  { value: 'Mobilité', icon: 'self_improvement', sub: 'Gagner en souplesse' },
]

interface SetDraft {
  reps: string
  weightKg: string
}
interface Draft {
  exercise: Pick<Exercise, 'id' | 'name' | 'muscleGroup' | 'mediaKey'>
  sets: SetDraft[]
}

/** Résumé des répétitions (« 10 » ou « 8-12 ») envoyé avec le détail par série. */
function summarizeReps(sets: SetDraft[]): string {
  const reps = sets.map((s) => s.reps).filter(Boolean)
  if (reps.length === 0) return '—'
  return new Set(reps).size === 1 ? reps[0] : `${reps[0]}-${reps[reps.length - 1]}`
}

function ExercisePicker({ onPick, onClose }: { onPick: (e: Exercise) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query.trim(), 250)
  const { data, isLoading } = useExercises(debounced, '')
  const list = (data ?? []).filter((e) => e.isActive).slice(0, 60)
  return (
    <Modal title="Ajouter un exercice" onClose={onClose} width="max-w-xl">
      <div className="space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un exercice…" />
        <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-2xl border border-border">
          {isLoading ? <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div> : list.length === 0 ? <p className="p-6 text-center text-sm text-muted">Aucun exercice trouvé.</p> : list.map((e) => (
            <button key={e.id} onClick={() => onPick(e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-primary-soft/50">
              {e.mediaKey ? <img src={e.mediaKey} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl bg-surface-2 object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink"><Icon name="exercise" size={22} /></span>}
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold capitalize">{e.name}</span><span className="block text-xs text-muted">{e.muscleGroup ?? '—'}</span></span>
              <Icon name="add_circle" size={22} className="text-primary" />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

/**
 * Nouveau programme (admin) : nom, niveau, objectif et exercices avec leurs séries (répétitions et charge). Comme au mobile,
 * le programme créé par l'admin est publié tout de suite, visible de tous les adhérents, sans validation.
 */
export function ProgramCreateModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const create = useCreateProgram()
  const [name, setName] = useState('')
  const [level, setLevel] = useState('Débutant')
  const [goal, setGoal] = useState('Perte de poids')
  const [items, setItems] = useState<Draft[]>([])
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const totalSets = items.reduce((n, i) => n + i.sets.length, 0)

  const patchSets = (index: number, fn: (sets: SetDraft[]) => SetDraft[]) => setItems((cur) => cur.map((it, i) => (i === index ? { ...it, sets: fn(it.sets) } : it)))

  const submit = () => {
    setError(null)
    create.mutate(
      {
        name: name.trim() || 'Nouveau programme',
        level,
        goal,
        days: [
          {
            dayOfWeek: 1,
            label: 'Séance complète',
            exercises: items.map((it) => ({
              exerciseId: it.exercise.id,
              sets: it.sets.length,
              reps: summarizeReps(it.sets),
              setDetails: it.sets.map((s, i) => ({ setNumber: i + 1, reps: s.reps ? Number(s.reps) : undefined, weightKg: s.weightKg ? Number(s.weightKg) : undefined })),
            })),
          },
        ],
      },
      { onSuccess: () => { toast('Programme publié'); onClose() }, onError: (e) => setError(apiErrorMessage(e, 'Impossible de publier le programme.')) },
    )
  }

  return (
    <>
      <Modal
        title="Nouveau programme"
        onClose={onClose}
        width="max-w-3xl"
        footer={
          <>
            <span className="mr-auto text-sm text-muted">{items.length} exercice{items.length > 1 ? 's' : ''} · {totalSets} série{totalSets > 1 ? 's' : ''}</span>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button icon="check" disabled={items.length === 0} loading={create.isPending} onClick={submit}>Publier le programme</Button>
          </>
        }
      >
        <div className="space-y-6">
          {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
          <div className="flex gap-2.5 rounded-2xl bg-primary-soft px-4 py-3 text-sm text-primary-ink"><Icon name="verified_user" size={20} /><span>Créé par l’administration : <b>publié immédiatement</b> et visible par tous les adhérents, sans validation.</span></div>
          <Field label="Nom du programme" icon="exercise" placeholder="Ex. Full body débutant" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

          <section className="space-y-2.5">
            <h3 className="text-sm font-bold">Niveau</h3>
            <div className="flex flex-wrap gap-2">{LEVELS.map((l) => <button key={l} onClick={() => setLevel(l)} className={cn('h-10 rounded-full px-4 text-sm font-bold transition', level === l ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink hover:bg-primary-border/60')}>{l}</button>)}</div>
          </section>
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold">Objectif</h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {GOALS.map((g) => (
                <button key={g.value} onClick={() => setGoal(g.value)} className={cn('flex items-center gap-3 rounded-2xl border-[1.5px] p-3.5 text-left transition', goal === g.value ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary-border')}>
                  <span className={cn('grid size-10 place-items-center rounded-xl', goal === g.value ? 'bg-gradient-to-br from-primary to-primary-pressed text-white' : 'bg-surface-2 text-primary-ink')}><Icon name={g.icon} size={22} /></span>
                  <span><span className="block text-sm font-bold">{g.value}</span><span className="block text-xs text-muted">{g.sub}</span></span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold">Exercices</h3>
            {items.map((it, i) => (
              <Card key={`${it.exercise.id}-${i}`} className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  {it.exercise.mediaKey ? <img src={it.exercise.mediaKey} alt="" className="size-12 rounded-xl bg-surface-2 object-cover" /> : <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary-ink"><Icon name="exercise" size={22} /></span>}
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold capitalize">{it.exercise.name}</div><div className="text-xs text-muted">{it.exercise.muscleGroup}</div></div>
                  <IconButton icon="delete" label="Retirer l’exercice" className="text-danger-ink hover:bg-danger-soft" onClick={() => setItems((cur) => cur.filter((_, k) => k !== i))} />
                </div>
                <div className="space-y-2">
                  {it.sets.map((s, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-xs font-bold">{k + 1}</span>
                      <input aria-label={`Répétitions série ${k + 1}`} inputMode="numeric" placeholder="Reps" value={s.reps} onChange={(e) => patchSets(i, (sets) => sets.map((x, n) => (n === k ? { ...x, reps: e.target.value.replace(/\D/g, '') } : x)))} className="h-10 w-24 rounded-xl border border-border bg-surface px-3 text-sm font-bold outline-none focus:border-primary" />
                      <span className="text-sm text-muted">reps</span>
                      <input aria-label={`Charge série ${k + 1}`} inputMode="decimal" placeholder="Poids" value={s.weightKg} onChange={(e) => patchSets(i, (sets) => sets.map((x, n) => (n === k ? { ...x, weightKg: e.target.value.replace(/[^\d.]/g, '') } : x)))} className="h-10 w-24 rounded-xl border border-border bg-surface px-3 text-sm font-bold outline-none focus:border-primary" />
                      <span className="text-sm text-muted">kg</span>
                      <IconButton icon="remove_circle" label="Retirer la série" disabled={it.sets.length <= 1} onClick={() => patchSets(i, (sets) => sets.filter((_, n) => n !== k))} />
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="soft" icon="add" onClick={() => patchSets(i, (sets) => [...sets, { reps: sets[sets.length - 1]?.reps ?? '10', weightKg: sets[sets.length - 1]?.weightKg ?? '' }])}>Ajouter une série</Button>
              </Card>
            ))}
            <button onClick={() => setPicking(true)} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-primary bg-primary-soft text-sm font-bold text-primary-ink hover:bg-primary-border/40"><Icon name="add" size={22} />Ajouter un exercice</button>
          </section>
        </div>
      </Modal>
      {picking ? <ExercisePicker onClose={() => setPicking(false)} onPick={(e) => { setItems((cur) => [...cur, { exercise: e, sets: [{ reps: '10', weightKg: '' }, { reps: '10', weightKg: '' }, { reps: '10', weightKg: '' }] }]); setPicking(false) }} /> : null}
    </>
  )
}
