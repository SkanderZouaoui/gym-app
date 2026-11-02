import type { OccupancyForm } from '../../lib/occupancyForm'
import { Button, Card, Field, Icon, SectionHeader, ToggleRow } from '../ui'

const decimal = (v: string) => v.replace(',', '.').replace(/[^0-9.]/g, '')
const integer = (v: string) => v.replace(/\D/g, '')

/** Présence et occupation : IP publique du WiFi, pondération des signaux, durées du réglage manuel, visibilité adhérents. */
export function OccupancySettingsForm({ form, requestIp, onChange }: { form: OccupancyForm; requestIp: string | null; onChange: (f: OccupancyForm) => void }) {
  const set = (p: Partial<OccupancyForm>) => onChange({ ...form, ...p })
  return (
    <>
      <div className="flex gap-2.5 rounded-2xl bg-info-soft px-4 py-3 text-sm font-semibold text-info-ink">
        <Icon name="info" size={20} />
        Approximation calculée à partir du WiFi de la salle et de l’activité de l’app : ce n’est pas un comptage exact.
      </div>

      <section className="space-y-3">
        <SectionHeader title="WiFi de la salle" icon="wifi" />
        <Card className="space-y-3 p-5">
          <Field label="IP publique du WiFi" icon="wifi" placeholder="203.0.113.7" autoCapitalize="none" autoCorrect="off" value={form.publicIp} onChange={(e) => set({ publicIp: e.target.value })} hint="Plusieurs IP séparées par des virgules. Si l’IP de la box change souvent, passez par un DDNS (No-IP, DuckDNS)." />
          {requestIp ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary-soft p-3.5">
              <Icon name="my_location" size={20} className="text-primary-ink" />
              <div className="min-w-0 flex-1"><div className="text-sm font-bold text-primary-ink">Utiliser mon IP actuelle ({requestIp})</div><div className="text-[13px] text-muted">À faire depuis le WiFi de la salle.</div></div>
              <Button size="sm" variant="soft" icon="check" onClick={() => set({ publicIp: requestIp })}>Utiliser</Button>
            </div>
          ) : null}
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Pondération" icon="tune" />
        <Card className="space-y-4 p-5">
          <p className="text-sm text-muted">Estimation = <b className="text-text">{form.wifiWeight || '0'}</b> × WiFi + <b className="text-text">{form.otherNetworkWeight || '0'}</b> × app ouverte ailleurs</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Poids WiFi (0 à 1)" icon="wifi" inputMode="decimal" value={form.wifiWeight} onChange={(e) => set({ wifiWeight: decimal(e.target.value) })} />
            <Field label="Poids app sur un autre réseau (0 à 1)" icon="smartphone" inputMode="decimal" value={form.otherNetworkWeight} onChange={(e) => set({ otherNetworkWeight: decimal(e.target.value) })} />
          </div>
          <Field label="Fenêtre de présence (minutes)" icon="schedule" inputMode="numeric" value={form.presenceWindowMinutes} onChange={(e) => set({ presenceWindowMinutes: integer(e.target.value) })} hint="Sans nouvelle activité pendant ce délai, l’adhérent sort du calcul." />
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Réglage manuel" icon="edit" />
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Durée par défaut (minutes)" icon="timer" inputMode="numeric" value={form.defaultDuration} onChange={(e) => set({ defaultDuration: integer(e.target.value) })} />
          <Field label="Durée maximale (minutes)" icon="timer_off" inputMode="numeric" value={form.maxDuration} onChange={(e) => set({ maxDuration: integer(e.target.value) })} hint="Utilisée pour « Jusqu’à nouvel ordre » : un réglage manuel expire toujours." />
        </Card>
        <Card className="overflow-hidden">
          <ToggleRow label="Visible par les adhérents" hint="Les adhérents voient seulement le chiffre estimé, sans le détail." checked={form.visibleToMembers} onChange={(v) => set({ visibleToMembers: v })} />
        </Card>
      </section>
    </>
  )
}
