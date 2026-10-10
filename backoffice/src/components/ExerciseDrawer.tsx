import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { exercisesApi, type CreateExerciseInput, type ExerciseItem } from '../api/endpoints'
import { Drawer } from './ui/Drawer'

const MUSCLES = ['Jambes', 'Pectoraux', 'Dos', 'Ischios', 'Fessiers', 'Épaules', 'Abdominaux', 'Hanches', 'Corps entier']
const EQUIPMENT = ['Poids du corps', 'Barre', 'Haltères', 'Kettlebell', 'Rameur', 'Machine', 'Tapis', 'Élastique']
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé']
const TYPE_LABELS: Record<ExerciseItem['type'], string> = { STRENGTH: 'Force', CARDIO: 'Cardio', MOBILITY: 'Mobilité' }
const TYPE_ICON: Record<ExerciseItem['type'], string> = { STRENGTH: 'fitness_center', CARDIO: 'directions_run', MOBILITY: 'self_improvement' }
const TYPE_TONE: Record<ExerciseItem['type'], string> = { STRENGTH: 'primary', CARDIO: 'danger', MOBILITY: 'info' }

export function ExerciseDrawer({ item, onClose }: { item: ExerciseItem | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateExerciseInput>({
    name: item?.name ?? '',
    muscleGroup: item?.muscleGroup ?? MUSCLES[0],
    equipment: item?.equipment ?? EQUIPMENT[0],
    level: item?.level ?? LEVELS[0],
    type: item?.type ?? 'STRENGTH',
    instructions: item?.instructions ?? '',
    mediaKey: item?.mediaKey ?? '',
  })

  const save = useMutation({
    mutationFn: () => (item ? exercisesApi.update(item.id, form) : exercisesApi.create(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      onClose()
    },
  })

  const remove = useMutation({
    mutationFn: () => exercisesApi.delete(item!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      onClose()
    },
  })

  return (
    <Drawer
      title={form.name || 'Nouvel exercice'}
      subtitle={`${form.muscleGroup} · ${form.equipment}`}
      icon={TYPE_ICON[form.type ?? 'STRENGTH']}
      tone={TYPE_TONE[form.type ?? 'STRENGTH']}
      onClose={onClose}
      onDelete={item ? () => remove.mutate() : undefined}
      footer={
        <button
          onClick={() => save.mutate()}
          disabled={!form.name.trim() || save.isPending}
          className="h-10 flex-1 rounded-lg bg-(--color-primary) px-4 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover) disabled:opacity-50"
        >
          {item ? 'Enregistrer' : 'Ajouter'}
        </button>
      }
    >
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Nom de l’exercice
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Groupe musculaire
          <select value={form.muscleGroup} onChange={(e) => setForm((f) => ({ ...f, muscleGroup: e.target.value }))} className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm">
            {MUSCLES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Matériel
          <select value={form.equipment} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))} className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm">
            {EQUIPMENT.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Niveau
          <select value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm">
            {LEVELS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Type
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ExerciseItem['type'] }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Consignes d’exécution
        <textarea
          value={form.instructions}
          onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
          rows={3}
          className="resize-vertical rounded-lg border border-(--color-border-strong) px-3 py-2.5 text-sm outline-none focus:border-(--color-primary)"
        />
      </label>
    </Drawer>
  )
}
