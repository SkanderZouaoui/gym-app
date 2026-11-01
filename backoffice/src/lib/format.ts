export const formatMoney = (amount: number | string) => `${Number(amount).toLocaleString('fr-FR')} DT`

export const formatDate = (iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('fr-FR', opts)

export const formatTime = (iso: string | Date) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export const formatDateTime = (iso: string | Date) => `${formatDate(iso, { day: 'numeric', month: 'short' })} · ${formatTime(iso)}`

export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

export const startOfDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER'
export const METHOD_LABEL: Record<PaymentMethod, string> = { CASH: 'Espèces', OTHER: 'Carte', TRANSFER: 'Virement', CHECK: 'Chèque' }
export const METHOD_ICON: Record<PaymentMethod, string> = { CASH: 'payments', OTHER: 'credit_card', TRANSFER: 'account_balance', CHECK: 'receipt_long' }

export function daysLeft(endDate: string, now = Date.now()) {
  return Math.ceil((new Date(endDate).getTime() - now) / 86_400_000)
}

export function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir'
}
