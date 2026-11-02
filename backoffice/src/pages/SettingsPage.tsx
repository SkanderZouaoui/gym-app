import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { occupancyApi, settingsApi, type AttendancePolicy, type OccupancySettings } from '../api/endpoints'
import { getApiErrorMessage } from '../api/client'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const { data: occupancy } = useQuery({ queryKey: ['occupancy-policy'], queryFn: occupancyApi.getSettings })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Paramètres</h1>
        <p className="text-sm text-(--color-muted)">Politique de présence, présence et occupation</p>
      </div>

      {settings ? (
        <AttendancePolicyCard
          policy={settings.attendancePolicy}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['settings'] })}
        />
      ) : (
        <p className="text-sm text-(--color-muted)">Chargement…</p>
      )}

      {occupancy ? (
        <OccupancyPolicyCard
          settings={occupancy}
          onSaved={(next) => {
            queryClient.setQueryData(['occupancy-policy'], next)
            void queryClient.invalidateQueries({ queryKey: ['occupancy'] })
          }}
        />
      ) : null}
    </div>
  )
}

const numberInput = 'h-10 w-28 rounded-lg border border-(--color-border) px-3 text-sm'

/**
 * Présence et occupation : IP publique du WiFi de la salle, poids des signaux, fenêtre et durées
 * des réglages manuels. Pondération globale à la salle (déploiement mono-site).
 * L'estimation obtenue reste une approximation, jamais un comptage exact.
 */
function OccupancyPolicyCard({ settings, onSaved }: { settings: OccupancySettings; onSaved: (next: OccupancySettings) => void }) {
  const [policy, setPolicy] = useState(settings.policy)
  const [publicIp, setPublicIp] = useState(settings.publicIp ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: occupancyApi.saveSettings,
    onSuccess: (next) => {
      setSaved(true)
      onSaved(next)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })
  const num = (key: keyof typeof policy) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPolicy({ ...policy, [key]: Number(e.target.value) })

  return (
    <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
      <h2 className="font-head text-base font-bold text-(--color-text)">Présence et occupation</h2>
      <p className="mt-1 text-sm text-(--color-muted)">
        Estimation du nombre de personnes dans la salle, sans tourniquet ni capteur. C’est une approximation, jamais un
        comptage exact.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {!settings.publicIp ? (
          <div className="flex items-center gap-2 rounded-xl border border-(--color-warning-border) bg-(--color-warning-soft) px-3 py-2 text-[13px] text-(--color-warning-ink)">
            <span className="material-symbols-rounded text-[18px]">wifi_off</span>
            IP du WiFi de la salle non renseignée : le signal WiFi vaut 0, seule l’activité de l’app (pondérée) est comptée.
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">IP publique du WiFi de la salle</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={publicIp}
              onChange={(e) => setPublicIp(e.target.value)}
              placeholder="203.0.113.7"
              className="h-10 w-72 rounded-lg border border-(--color-border) px-3 text-sm"
            />
            {settings.requestIp ? (
              <button
                onClick={() => setPublicIp(settings.requestIp ?? '')}
                className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-[13px] font-bold hover:bg-(--color-surface-2)"
              >
                Utiliser mon IP actuelle ({settings.requestIp})
              </button>
            ) : null}
          </div>
          <p className="text-[12.5px] text-(--color-muted)">
            À faire depuis le WiFi de la salle. Plusieurs IP séparées par des virgules. Si l’IP de la box change souvent,
            passez par un DDNS (No-IP, DuckDNS).
            {settings.publicIp && settings.publicIpUpdatedAt ? ` Dernière mise à jour : ${new Date(settings.publicIpUpdatedAt).toLocaleString('fr-FR')}.` : ''}
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold">Pondération</div>
          <p className="text-[12.5px] text-(--color-muted)">
            Estimation = {policy.wifiWeight} × WiFi + {policy.otherNetworkWeight} × app ouverte sur un autre réseau
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Poids WiFi</label>
            <input type="number" min={0} max={1} step={0.05} value={policy.wifiWeight} onChange={num('wifiWeight')} className={numberInput} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Poids autre réseau</label>
            <input type="number" min={0} max={1} step={0.05} value={policy.otherNetworkWeight} onChange={num('otherNetworkWeight')} className={numberInput} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Fenêtre de présence (min)</label>
            <input type="number" min={5} max={240} value={policy.presenceWindowMinutes} onChange={num('presenceWindowMinutes')} className={numberInput} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Réglage manuel : durée par défaut (min)</label>
            <input type="number" min={5} max={720} value={policy.manualOverrideDefaultDurationMinutes} onChange={num('manualOverrideDefaultDurationMinutes')} className={numberInput} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Durée maximale (min)</label>
            <input type="number" min={15} max={1440} value={policy.manualOverrideMaxDurationMinutes} onChange={num('manualOverrideMaxDurationMinutes')} className={numberInput} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={policy.visibleToMembers}
            onChange={(e) => setPolicy({ ...policy, visibleToMembers: e.target.checked })}
          />
          Afficher l’estimation aux adhérents (chiffre seul, sans le détail)
        </label>

        {error ? <p className="text-sm font-medium text-(--color-danger)">{error}</p> : null}
        {saved && !error ? <p className="text-sm font-medium text-(--color-success-ink)">Réglages enregistrés</p> : null}

        <button
          onClick={() => {
            setError(null)
            setSaved(false)
            save.mutate({ ...policy, publicIp: publicIp.trim() || null })
          }}
          disabled={save.isPending}
          className="h-10 w-fit rounded-lg bg-(--color-primary) px-4 text-sm font-bold text-white hover:bg-(--color-primary-hover) disabled:opacity-50"
        >
          Enregistrer
        </button>
      </div>
    </section>
  )
}

function AttendancePolicyCard({ policy, onSaved }: { policy: AttendancePolicy; onSaved: () => void }) {
  const [form, setForm] = useState(policy)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setForm(policy), [policy])

  const save = useMutation({
    mutationFn: settingsApi.updateAttendance,
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  return (
    <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
      <h2 className="font-head text-base font-bold text-(--color-text)">Politique de présence</h2>
      <p className="mt-1 text-sm text-(--color-muted)">Fenêtre de scan, inscription sur place, no-show.</p>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Scan ouvert avant (min)</label>
            <input
              type="number"
              min={0}
              value={form.scanOpensMinutesBefore}
              onChange={(e) => setForm({ ...form, scanOpensMinutesBefore: Number(e.target.value) })}
              className="h-10 w-28 rounded-lg border border-(--color-border) px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Scan fermé après (min)</label>
            <input
              type="number"
              min={0}
              value={form.scanClosesMinutesAfterStart}
              onChange={(e) => setForm({ ...form, scanClosesMinutesAfterStart: Number(e.target.value) })}
              className="h-10 w-28 rounded-lg border border-(--color-border) px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Délai de grâce no-show (min)</label>
            <input
              type="number"
              min={0}
              value={form.noShowGraceMinutes}
              onChange={(e) => setForm({ ...form, noShowGraceMinutes: Number(e.target.value) })}
              className="h-10 w-28 rounded-lg border border-(--color-border) px-3 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.allowWalkIn}
            onChange={(e) => setForm({ ...form, allowWalkIn: e.target.checked })}
          />
          Autoriser l'inscription sur place (walk-in)
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.staffCanRecordPayments}
            onChange={(e) => setForm({ ...form, staffCanRecordPayments: e.target.checked })}
          />
          Le staff peut enregistrer des encaissements
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.noShowPenalty.enabled}
            onChange={(e) =>
              setForm({ ...form, noShowPenalty: { ...form.noShowPenalty, enabled: e.target.checked } })
            }
          />
          Pénalité de no-show activée
        </label>

        {form.noShowPenalty.enabled ? (
          <div className="flex gap-4 pl-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Seuil (no-show)</label>
              <input
                type="number"
                min={1}
                value={form.noShowPenalty.threshold}
                onChange={(e) =>
                  setForm({ ...form, noShowPenalty: { ...form.noShowPenalty, threshold: Number(e.target.value) } })
                }
                className="h-10 w-24 rounded-lg border border-(--color-border) px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Fenêtre (jours)</label>
              <input
                type="number"
                min={1}
                value={form.noShowPenalty.windowDays}
                onChange={(e) =>
                  setForm({ ...form, noShowPenalty: { ...form.noShowPenalty, windowDays: Number(e.target.value) } })
                }
                className="h-10 w-24 rounded-lg border border-(--color-border) px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Blocage (jours)</label>
              <input
                type="number"
                min={1}
                value={form.noShowPenalty.blockBookingDays}
                onChange={(e) =>
                  setForm({
                    ...form,
                    noShowPenalty: { ...form.noShowPenalty, blockBookingDays: Number(e.target.value) },
                  })
                }
                className="h-10 w-24 rounded-lg border border-(--color-border) px-3 text-sm"
              />
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm font-medium text-(--color-danger)">{error}</p> : null}

        <button
          onClick={() => {
            setError(null)
            save.mutate(form)
          }}
          disabled={save.isPending}
          className="h-10 w-fit rounded-lg bg-(--color-primary) px-4 text-sm font-bold text-white hover:bg-(--color-primary-hover) disabled:opacity-50"
        >
          Enregistrer
        </button>
      </div>
    </section>
  )
}
