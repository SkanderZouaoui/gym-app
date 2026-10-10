import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { classTemplatesApi, classTypesApi, coachesApi, type ClassTemplateItem, type CreateClassTemplateInput } from '../api/endpoints'
import { Drawer } from './ui/Drawer'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export function SessionDrawer({
  item,
  presetDay,
  onClose,
}: {
  item: ClassTemplateItem | null
  presetDay?: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { data: types } = useQuery({ queryKey: ['class-types', 'admin'], queryFn: classTypesApi.findAllForAdmin })
  const { data: coaches } = useQuery({ queryKey: ['coaches'], queryFn: coachesApi.findAll })

  const [form, setForm] = useState<CreateClassTemplateInput>({
    classTypeId: item?.classTypeId ?? types?.[0]?.id ?? '',
    coachId: item?.coachId ?? undefined,
    capacity: item?.capacity ?? 20,
    dayOfWeek: item?.dayOfWeek ?? presetDay ?? 1,
    startTime: item?.startTime ?? '18:00',
    durationMin: item?.durationMin ?? 45,
  })

  const save = useMutation({
    mutationFn: () => (item ? classTemplatesApi.update(item.id, form) : classTemplatesApi.create(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-templates'] })
      onClose()
    },
  })

  const remove = useMutation({
    mutationFn: () => classTemplatesApi.deactivate(item!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-templates'] })
      onClose()
    },
  })

  const selectedType = types?.find((t) => t.id === form.classTypeId)

  return (
    <Drawer
      title={selectedType?.name ?? 'Nouvelle séance'}
      subtitle={`${DAYS[form.dayOfWeek]} ${form.startTime}`}
      icon={selectedType?.icon}
      tone={selectedType?.tone}
      onClose={onClose}
      onDelete={item ? () => remove.mutate() : undefined}
      footer={
        <button
          onClick={() => save.mutate()}
          disabled={!form.classTypeId || save.isPending}
          className="h-10 flex-1 rounded-lg bg-(--color-primary) px-4 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover) disabled:opacity-50"
        >
          {item ? 'Enregistrer' : 'Ajouter'}
        </button>
      }
    >
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Cours
        <select
          value={form.classTypeId}
          onChange={(e) => setForm((f) => ({ ...f, classTypeId: e.target.value }))}
          className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm"
        >
          {(types ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Jour
          <select
            value={form.dayOfWeek}
            onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Heure
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Coach
        <select
          value={form.coachId ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value || undefined }))}
          className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm"
        >
          <option value="">—</option>
          {(coaches ?? []).map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.user.firstName} {c.user.lastName}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Durée (min)
          <input
            type="number"
            value={form.durationMin}
            onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Capacité
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm"
          />
        </label>
      </div>
    </Drawer>
  )
}
