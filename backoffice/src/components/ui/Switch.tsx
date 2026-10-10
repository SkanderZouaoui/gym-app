export function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`flex h-6 w-10 flex-none items-center rounded-full p-0.5 transition disabled:opacity-50 ${
        checked ? 'justify-end bg-(--color-primary)' : 'justify-start bg-(--color-border-strong)'
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow" />
    </button>
  )
}
