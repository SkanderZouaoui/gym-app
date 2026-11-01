import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { useApproveProgram, useDeactivateExercise, useExercises, useMuscleGroups, useRejectProgram, useReviewPrograms, useSaveExercise, type Exercise, type ProgramStatus, type ReviewProgram } from '../api/content'
import { formatDate } from '../lib/format'
import { Avatar, Badge, Button, Card, ChipChoice, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, Icon, Modal, PageHeader, SearchInput, SectionHeader, SelectField, Skeleton, Tabs, TextArea, useToast } from '../components/ui'
import { useDebounce } from '../lib/hooks'
import { ProgramCreateModal } from '../components/domain/ProgramCreateModal'

const STATUS: Record<ProgramStatus, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'En validation', tone: 'warning' },
  APPROVED: { label: 'Validé', tone: 'success' },
  REJECTED: { label: 'Refusé', tone: 'danger' },
}
const DAY = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const TYPES = [{ value: 'STRENGTH', label: 'Force' }, { value: 'CARDIO', label: 'Cardio' }, { value: 'MOBILITY', label: 'Mobilité' }] as const
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé']

function ProgramDrawer({ program, onClose }: { program: ReviewProgram; onClose: () => void }) {
  const toast = useToast()
  const approve = useApproveProgram()
  const reject = useRejectProgram()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const exercises = program.days.reduce((n, d) => n + d.exercises.length, 0)
  const pending = program.status === 'PENDING'

  return (
    <>
      <Drawer
        title={program.name}
        subtitle={`Par ${program.createdBy.firstName} ${program.createdBy.lastName} · ${formatDate(program.createdAt)}`}
        onClose={onClose}
        width="max-w-2xl"
        footer={
          pending ? (
            <>
              <Button variant="danger" icon="close" className="flex-1" onClick={() => setRejecting(true)}>Refuser</Button>
              <Button icon="check" className="flex-1" loading={approve.isPending} onClick={() => approve.mutate(program.id, { onSuccess: () => { toast('Programme validé et publié'); onClose() }, onError: (e) => toast(apiErrorMessage(e), 'danger') })}>Valider et publier</Button>
            </>
          ) : undefined
        }
      >
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone={STATUS[program.status].tone} dot>{STATUS[program.status].label}</Badge>
            {program.level ? <Badge tone="info">{program.level}</Badge> : null}
            {program.goal ? <Badge tone="primary">{program.goal}</Badge> : null}
            <Badge>{program.isPublic ? 'Visible par tous les adhérents' : `Pour ${program.assignedTo.firstName} ${program.assignedTo.lastName}`}</Badge>
            <Badge>{exercises} exercice{exercises > 1 ? 's' : ''}</Badge>
          </div>
          {program.status === 'REJECTED' && program.rejectionNote ? (
            <div className="flex gap-2.5 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-ink"><Icon name="feedback" size={20} /><div><div className="font-bold">Motif du refus</div>{program.rejectionNote}</div></div>
          ) : null}
          {program.days.map((d) => (
            <section key={d.id} className="space-y-2.5">
              <SectionHeader title={d.label ?? DAY[d.dayOfWeek]} icon="calendar_today" />
              <Card className="divide-y divide-border overflow-hidden">
                {d.exercises.length === 0 ? <p className="p-5 text-center text-sm text-muted">Aucun exercice.</p> : d.exercises.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    {e.exercise.mediaKey ? <img src={e.exercise.mediaKey} alt="" className="size-14 shrink-0 rounded-xl bg-surface-2 object-cover" loading="lazy" /> : <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink"><Icon name="exercise" size={24} /></span>}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold capitalize">{e.exercise.name}</div>
                      <div className="text-xs text-muted">{e.exercise.muscleGroup}{e.notes ? ` · ${e.notes}` : ''}</div>
                    </div>
                    <div className="text-right text-xs"><div className="font-head text-sm font-extrabold">{e.sets} × {e.reps}</div>{e.restSeconds ? <div className="text-muted">repos {e.restSeconds} s</div> : null}</div>
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      </Drawer>
      {rejecting ? (
        <Modal
          title="Refuser ce programme"
          onClose={() => setRejecting(false)}
          width="max-w-md"
          footer={<><Button variant="outline" onClick={() => setRejecting(false)}>Annuler</Button><Button variant="danger" loading={reject.isPending} onClick={() => reject.mutate({ id: program.id, note: note.trim() || undefined }, { onSuccess: () => { toast('Programme refusé'); onClose() }, onError: (e) => toast(apiErrorMessage(e), 'danger') })}>Refuser</Button></>}
        >
          <TextArea label="Motif (facultatif)" icon="feedback" placeholder="Expliquez au coach ce qu'il faut corriger" value={note} onChange={(e) => setNote(e.target.value)} />
        </Modal>
      ) : null}
    </>
  )
}

function Validation() {
  const { data, isLoading, isError, refetch } = useReviewPrograms()
  const [filter, setFilter] = useState<ProgramStatus | 'all'>('PENDING')
  const [open, setOpen] = useState<string | null>(null)
  const programs = data ?? []
  const count = (s: ProgramStatus) => programs.filter((p) => p.status === s).length
  const shown = programs.filter((p) => filter === 'all' || p.status === filter)
  const current = programs.find((p) => p.id === open)

  return (
    <div className="space-y-4">
      <Tabs value={filter} onChange={setFilter} options={[{ value: 'PENDING', label: 'En validation', count: count('PENDING') }, { value: 'APPROVED', label: 'Validés', count: count('APPROVED') }, { value: 'REJECTED', label: 'Refusés', count: count('REJECTED') }, { value: 'all', label: 'Tous', count: programs.length }]} />
      {isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div> : isError ? <Card><ErrorState onRetry={() => void refetch()} /></Card> : shown.length === 0 ? (
        <Card><EmptyState icon="fact_check" title={filter === 'PENDING' ? 'Aucun programme à valider' : 'Aucun programme'} hint="Les programmes proposés par les coachs apparaissent ici pour validation." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <button key={p.id} onClick={() => setOpen(p.id)} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary-border">
              <div className="flex items-start gap-2"><div className="min-w-0 flex-1 truncate font-head text-base font-bold">{p.name}</div><Badge tone={STATUS[p.status].tone} dot>{STATUS[p.status].label}</Badge></div>
              <div className="flex flex-wrap gap-1.5">{p.level ? <Badge tone="info">{p.level}</Badge> : null}{p.goal ? <Badge tone="primary">{p.goal}</Badge> : null}</div>
              <div className="mt-auto flex items-center gap-2 text-xs text-muted"><Avatar firstName={p.createdBy.firstName} lastName={p.createdBy.lastName} size={24} />{p.createdBy.firstName} {p.createdBy.lastName} · {formatDate(p.createdAt, { day: 'numeric', month: 'short' })}</div>
            </button>
          ))}
        </div>
      )}
      {current ? <ProgramDrawer key={current.id} program={current} onClose={() => setOpen(null)} /> : null}
    </div>
  )
}

function ExerciseModal({ item, onClose }: { item?: Exercise; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveExercise()
  const deactivate = useDeactivateExercise()
  const { data: groups } = useMuscleGroups()
  const [name, setName] = useState(item?.name ?? '')
  const [muscleGroup, setMuscleGroup] = useState(item?.muscleGroup ?? '')
  const [equipment, setEquipment] = useState(item?.equipment ?? '')
  const [level, setLevel] = useState(item?.level ?? 'Débutant')
  const [type, setType] = useState<Exercise['type']>(item?.type ?? 'STRENGTH')
  const [instructions, setInstructions] = useState(item?.instructions ?? '')
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <Modal
        title={item ? "Modifier l'exercice" : 'Nouvel exercice'}
        onClose={onClose}
        width="max-w-2xl"
        footer={
          <>
            {item?.isActive ? <Button variant="danger" icon="block" className="mr-auto" onClick={() => setConfirm(true)}>Désactiver</Button> : null}
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button icon="check" disabled={!name.trim()} loading={save.isPending}
              onClick={() => save.mutate({ id: item?.id, name: name.trim(), muscleGroup: muscleGroup || undefined, equipment: equipment.trim() || undefined, level, type, instructions: instructions.trim() || undefined }, { onSuccess: () => { toast(item ? 'Exercice enregistré' : 'Exercice créé'); onClose() }, onError: (e) => setError(apiErrorMessage(e, "Impossible d'enregistrer l'exercice.")) })}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
          {item?.mediaKey ? <img src={item.mediaKey} alt="" className="mx-auto max-h-48 rounded-2xl bg-surface-2 object-contain" /> : null}
          <Field label="Nom" icon="exercise" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Groupe musculaire" icon="accessibility_new" value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)}>
              <option value="">Non précisé</option>
              {(groups ?? []).map((g) => <option key={g} value={g}>{g}</option>)}
              {muscleGroup && !(groups ?? []).includes(muscleGroup) ? <option value={muscleGroup}>{muscleGroup}</option> : null}
            </SelectField>
            <Field label="Équipement" icon="fitness_center" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          </div>
          <Card className="overflow-hidden"><ChipChoice label="Type" value={type} options={[...TYPES]} onChange={setType} /></Card>
          <Card className="overflow-hidden"><ChipChoice label="Niveau" value={level} options={LEVELS.map((l) => ({ value: l, label: l }))} onChange={setLevel} /></Card>
          <TextArea label="Instructions" icon="notes" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </div>
      </Modal>
      {confirm && item ? <ConfirmDialog danger title={`Désactiver « ${item.name} » ?`} message="L'exercice ne sera plus proposé dans la bibliothèque ; les programmes existants le conservent." confirmLabel="Désactiver" loading={deactivate.isPending} onClose={() => setConfirm(false)} onConfirm={() => deactivate.mutate(item.id, { onSuccess: () => { toast('Exercice désactivé'); onClose() }, onError: (e) => { toast(apiErrorMessage(e), 'danger'); setConfirm(false) } })} /> : null}
    </>
  )
}

function Exercises() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)
  const { data: groups } = useMuscleGroups()
  const debounced = useDebounce(query.trim(), 300)
  const { data, isLoading, isError, refetch } = useExercises(debounced, group)
  const shown = (data ?? []).slice(0, 120)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un exercice…" />
        <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Groupe musculaire" className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary">
          <option value="">Tous les groupes</option>
          {(groups ?? []).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="text-sm text-muted">{data?.length ?? 0} exercice{(data?.length ?? 0) > 1 ? 's' : ''}</span>
        <Button className="ml-auto" size="sm" icon="add" onClick={() => setEditing('new')}>Nouvel exercice</Button>
      </div>
      {isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div> : isError ? <Card><ErrorState onRetry={() => void refetch()} /></Card> : shown.length === 0 ? (
        <Card><EmptyState icon="exercise" title="Aucun exercice" hint="Aucun exercice ne correspond à cette recherche." /></Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((e) => (
              <button key={e.id} onClick={() => setEditing(e)} className={`flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-card transition hover:border-primary-border ${e.isActive ? '' : 'opacity-55'}`}>
                {e.mediaKey ? <img src={e.mediaKey} alt="" loading="lazy" className="size-16 shrink-0 rounded-xl bg-surface-2 object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink"><Icon name="exercise" size={26} /></span>}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold capitalize">{e.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">{e.muscleGroup ? <Badge tone="primary">{e.muscleGroup}</Badge> : null}{!e.isActive ? <Badge tone="warning">Désactivé</Badge> : null}{e.usedInPrograms ? <Badge>{e.usedInPrograms} programme{e.usedInPrograms > 1 ? 's' : ''}</Badge> : null}</div>
                </div>
              </button>
            ))}
          </div>
          {(data?.length ?? 0) > shown.length ? <p className="text-center text-sm text-muted">Affichage des {shown.length} premiers résultats — affinez la recherche pour en voir d’autres.</p> : null}
        </>
      )}
      {editing ? <ExerciseModal key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

/** Programmes : validation des programmes proposés par les coachs, et bibliothèque d'exercices. */
export function ProgramsPage() {
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const tab = params.get('tab') === 'exercises' ? 'exercises' : 'validation'
  return (
    <div className="space-y-6">
      <PageHeader title="Programmes" subtitle="Validation des programmes des coachs et bibliothèque d’exercices." actions={<Button icon="add" onClick={() => setCreating(true)}>Nouveau programme</Button>} />
      {creating ? <ProgramCreateModal onClose={() => setCreating(false)} /> : null}
      <Tabs value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} options={[{ value: 'validation', label: 'Validation' }, { value: 'exercises', label: 'Exercices' }]} />
      {tab === 'validation' ? <Validation /> : <Exercises />}
    </div>
  )
}
