import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type AttendancePolicy, type MultiBranchPolicy } from '../api/endpoints'
import { getApiErrorMessage } from '../api/client'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Paramètres</h1>
        <p className="text-sm text-(--color-muted)">Règles multi-sites et politique de présence</p>
      </div>

      {settings ? (
        <>
          <MultiBranchPolicyCard
            policy={settings.multiBranchPolicy}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['settings'] })}
          />
          <AttendancePolicyCard
            policy={settings.attendancePolicy}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['settings'] })}
          />
        </>
      ) : (
        <p className="text-sm text-(--color-muted)">Chargement…</p>
      )}
    </div>
  )
}

function MultiBranchPolicyCard({ policy, onSaved }: { policy: MultiBranchPolicy; onSaved: () => void }) {
  const [form, setForm] = useState(policy)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setForm(policy), [policy])

  const save = useMutation({
    mutationFn: settingsApi.updateMultiBranch,
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  return (
    <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
      <h2 className="font-head text-base font-bold text-(--color-text)">Règles multi-sites</h2>
      <p className="mt-1 text-sm text-(--color-muted)">
        Défaut réseau appliqué à toutes les formules sans surcharge explicite.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Validité de l'abonnement par défaut</label>
          <select
            value={form.defaultAccessScope}
            onChange={(e) =>
              setForm({ ...form, defaultAccessScope: e.target.value as MultiBranchPolicy['defaultAccessScope'] })
            }
            className="h-10 w-64 rounded-lg border border-(--color-border) px-3 text-sm"
          >
            <option value="HOME_ONLY">Site d'origine uniquement</option>
            <option value="ALL">Tous les sites</option>
            <option value="SELECTED">Sites sélectionnés par formule</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Réservation dans un autre site</label>
          <select
            value={form.crossBranchBooking.mode}
            onChange={(e) =>
              setForm({
                ...form,
                crossBranchBooking: {
                  ...form.crossBranchBooking,
                  mode: e.target.value as MultiBranchPolicy['crossBranchBooking']['mode'],
                },
              })
            }
            className="h-10 w-64 rounded-lg border border-(--color-border) px-3 text-sm"
          >
            <option value="DISABLED">Désactivée</option>
            <option value="ENABLED">Activée</option>
            <option value="LIMITED">Limitée (quota + fenêtre)</option>
          </select>
        </div>

        {form.crossBranchBooking.mode === 'LIMITED' ? (
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Quota mensuel</label>
              <input
                type="number"
                min={0}
                value={form.crossBranchBooking.monthlyQuota ?? 0}
                onChange={(e) =>
                  setForm({
                    ...form,
                    crossBranchBooking: { ...form.crossBranchBooking, monthlyQuota: Number(e.target.value) },
                  })
                }
                className="h-10 w-32 rounded-lg border border-(--color-border) px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Fenêtre de réservation (heures)</label>
              <input
                type="number"
                min={1}
                value={form.crossBranchBooking.bookingWindowHours ?? 24}
                onChange={(e) =>
                  setForm({
                    ...form,
                    crossBranchBooking: { ...form.crossBranchBooking, bookingWindowHours: Number(e.target.value) },
                  })
                }
                className="h-10 w-32 rounded-lg border border-(--color-border) px-3 text-sm"
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
