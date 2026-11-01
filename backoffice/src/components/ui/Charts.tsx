import { cn } from './cn'

/** Barres verticales simples (valeur au-dessus, étiquette dessous). */
export function BarChart({ data, height = 160, format = String }: { data: { label: string; value: number }[]; height?: number; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] font-bold">{d.value > 0 ? format(d.value) : ''}</span>
          <div className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-primary to-[#8B5CF6]" style={{ height: `${Math.max(d.value > 0 ? 4 : 2, (d.value / max) * 78)}%`, opacity: d.value === 0 ? 0.2 : 1 }} />
          <span className="w-full truncate text-center text-[11px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Anneau de proportion (0–100). */
export function Ring({ percent, label, sub, tone = 'primary', size = 112 }: { percent: number; label: string; sub?: string; tone?: 'primary' | 'success' | 'warning' | 'danger'; size?: number }) {
  const r = 44
  const c = 2 * Math.PI * r
  const color = { primary: 'var(--color-primary)', success: 'var(--color-success)', warning: 'var(--color-warning)', danger: 'var(--color-danger)' }[tone]
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0 -rotate-90" role="img" aria-label={`${label} : ${Math.round(percent)} %`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="11" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, percent)) / 100)} />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center fill-current font-head text-[22px] font-extrabold" style={{ transformOrigin: '50px 50px' }}>{Math.round(percent)}%</text>
      </svg>
      <div className="min-w-0">
        <div className="font-head text-base font-bold">{label}</div>
        {sub ? <div className="text-sm text-muted">{sub}</div> : null}
      </div>
    </div>
  )
}

/** Barre empilée avec légende (répartition). */
export function SplitBar({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = parts.reduce((n, p) => n + p.value, 0)
  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        {parts.map((p) => (p.value > 0 ? <div key={p.label} className={cn('h-full', p.className)} style={{ width: `${(p.value / Math.max(1, total)) * 100}%` }} /> : null))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-2"><span className={cn('size-2.5 rounded-full', p.className)} /><span className="text-muted">{p.label}</span><b>{p.value}</b></span>
        ))}
      </div>
    </div>
  )
}
