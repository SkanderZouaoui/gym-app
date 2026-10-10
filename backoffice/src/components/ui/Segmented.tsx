export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="inline-flex w-fit gap-0.5 rounded-lg bg-(--color-surface-2) p-0.75">
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`h-7.5 rounded-md px-3 text-[13px] font-semibold ${
              active ? 'bg-(--color-surface) text-(--color-text) shadow-sm' : 'text-(--color-muted)'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
