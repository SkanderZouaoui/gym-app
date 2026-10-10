import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classTypesApi, type ClassTypeItem, type CreateClassTypeInput } from '../api/endpoints'
import { Drawer } from './ui/Drawer'

const ICON_OPTS = [
  'local_fire_department',
  'self_improvement',
  'directions_bike',
  'sports_gymnastics',
  'sports_mma',
  'accessibility_new',
  'fitness_center',
  'directions_run',
  'pool',
]

const TONE_OPTS: { v: CreateClassTypeInput['tone']; l: string }[] = [
  { v: 'primary', l: 'Primaire' },
  { v: 'secondary', l: 'Secondaire' },
  { v: 'accent', l: 'Accent' },
  { v: 'success', l: 'Vert' },
  { v: 'info', l: 'Bleu' },
  { v: 'warning', l: 'Ambre' },
  { v: 'danger', l: 'Rouge' },
]

export function ClassTypeDrawer({ item, onClose }: { item: ClassTypeItem | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateClassTypeInput>(
    item
      ? {
          name: item.name,
          description: item.description ?? '',
          level: item.level ?? '',
          icon: item.icon,
          tone: item.tone,
          isBookable: item.isBookable,
          defaultCapacity: item.defaultCapacity,
          defaultDurationMin: item.defaultDurationMin,
        }
      : {
          name: '',
          description: '',
          level: 'Tous niveaux',
          icon: 'fitness_center',
          tone: 'primary',
          isBookable: true,
          defaultCapacity: 16,
          defaultDurationMin: 45,
        },
  )

  const save = useMutation({
    mutationFn: () => (item ? classTypesApi.update(item.id, form) : classTypesApi.create(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-types'] })
      onClose()
    },
  })

  return (
    <Drawer
      title={form.name || 'Nouveau cours'}
      subtitle={`${form.defaultDurationMin} min · ${form.defaultCapacity} places`}
      icon={form.icon}
      tone={form.tone}
      onClose={onClose}
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
        Nom du cours
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Niveau / intensité
        <input
          value={form.level}
          onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
          className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Durée (min)
          <input
            type="number"
            value={form.defaultDurationMin}
            onChange={(e) => setForm((f) => ({ ...f, defaultDurationMin: Number(e.target.value) }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Capacité par défaut
          <input
            type="number"
            value={form.defaultCapacity}
            onChange={(e) => setForm((f) => ({ ...f, defaultCapacity: Number(e.target.value) }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
          />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Pictogramme</span>
        <div className="grid grid-cols-5 gap-1.5">
          {ICON_OPTS.map((icon) => (
            <button
              key={icon}
              onClick={() => setForm((f) => ({ ...f, icon }))}
              className={`grid h-10 place-items-center rounded-lg border ${
                form.icon === icon ? 'border-(--color-primary) bg-(--color-primary-soft)' : 'border-(--color-border)'
              }`}
            >
              <span className="material-symbols-rounded text-[20px]">{icon}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Couleur</span>
        <div className="flex flex-wrap gap-1.5">
          {TONE_OPTS.map((t) => (
            <button
              key={t.v}
              onClick={() => setForm((f) => ({ ...f, tone: t.v }))}
              className={`h-8 rounded-full border px-3 text-xs font-semibold ${
                form.tone === t.v ? 'border-(--color-primary)' : 'border-(--color-border)'
              }`}
              style={{ background: `var(--color-${t.v}-soft)`, color: `var(--color-${t.v}-ink)` }}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>
    </Drawer>
  )
}
