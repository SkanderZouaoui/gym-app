import { useCallback, useState, type ReactNode } from 'react'
import { ToastContext, type ToastItem } from './toast-context'
import { Icon } from './Icon'
import { cn } from './cn'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string, tone: ToastItem['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setItems((cur) => [...cur, { id, text, tone }])
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3500)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-6 top-6 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} role="status" className={cn('pop-in flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold shadow-pop', t.tone === 'success' ? 'bg-secondary text-white' : 'bg-danger text-white')}>
            <Icon name={t.tone === 'success' ? 'check_circle' : 'error'} size={20} />
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
