import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { classTemplatesApi, type ClassTemplateItem } from '../api/endpoints'
import { SessionDrawer } from '../components/SessionDrawer'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function PlanningPage() {
  const { data: templates } = useQuery({ queryKey: ['class-templates'], queryFn: classTemplatesApi.findAll })
  const [drawer, setDrawer] = useState<{ item: ClassTemplateItem | null; day?: number } | null>(null)

  const byDay = DISPLAY_ORDER.map((day) => ({
    day,
    items: (templates ?? [])
      .filter((t) => t.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }))
  const totalCount = templates?.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Planning</h1>
          <p className="text-sm text-(--color-muted)">{totalCount} séance(s) récurrente(s) par semaine</p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setDrawer({ item: null })}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-(--color-primary) px-3.5 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover)"
        >
          <span className="material-symbols-rounded text-[18px]">add</span>
          Nouvelle séance
        </button>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[1000px] grid-cols-7 gap-2.5">
          {byDay.map(({ day, items }) => (
            <div key={day} className="flex min-h-90 flex-col gap-2 rounded-2xl border border-(--color-border) bg-(--color-surface) p-2.5">
              <div className="flex items-baseline justify-between border-b border-(--color-border) px-1 pb-1.5">
                <span className="text-[13.5px] font-bold">{DAYS[day]}</span>
                <span className="text-xs text-(--color-muted)">{items.length}</span>
              </div>
              {items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setDrawer({ item: s })}
                  className="flex flex-col gap-0.5 rounded-lg border p-2.5 text-start"
                  style={{
                    borderColor: `var(--color-${s.classType.tone}-border)`,
                    background: `var(--color-${s.classType.tone}-soft)`,
                  }}
                >
                  <span className="font-mono text-[11.5px] font-semibold" style={{ color: `var(--color-${s.classType.tone}-ink)` }}>
                    {s.startTime}
                  </span>
                  <span className="text-[13px] font-bold leading-tight">{s.classType.name}</span>
                  <span className="text-[11.5px] text-(--color-muted)">
                    {s.coach ? s.coach.user.firstName : '—'} · {s.room?.name ?? 'Salle'}
                  </span>
                  <span className="text-[11.5px] font-bold">Capacité {s.capacity}</span>
                </button>
              ))}
              <button
                onClick={() => setDrawer({ item: null, day })}
                className="mt-auto flex h-8 items-center justify-center gap-1 rounded-lg border border-dashed border-(--color-border-strong) text-xs font-semibold text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-text)"
              >
                <span className="material-symbols-rounded text-[16px]">add</span>
                Ajouter
              </button>
            </div>
          ))}
        </div>
      </div>

      {drawer ? <SessionDrawer item={drawer.item} presetDay={drawer.day} onClose={() => setDrawer(null)} /> : null}
    </div>
  )
}
