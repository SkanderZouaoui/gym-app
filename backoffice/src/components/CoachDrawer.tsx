import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { coachesApi, type CoachListItem } from '../api/endpoints'
import { Drawer } from './ui/Drawer'

const STATUS_OPTS: { v: CoachListItem['status']; l: string }[] = [
  { v: 'ACTIVE', l: 'Actif' },
  { v: 'ON_LEAVE', l: 'En congé' },
  { v: 'INACTIVE', l: 'Inactif' },
]

const STATUS_TONE: Record<CoachListItem['status'], string> = { ACTIVE: 'success', ON_LEAVE: 'warning', INACTIVE: 'danger' }

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export function CoachDrawer({ item, onClose }: { item: CoachListItem | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    firstName: item?.user.firstName ?? '',
    lastName: item?.user.lastName ?? '',
    email: item?.user.email ?? '',
    phone: item?.user.phone ?? '',
    password: '',
    bio: item?.bio ?? '',
    specialties: item?.specialties.join(', ') ?? '',
    sessionPrice: item?.sessionPrice ? Number(item.sessionPrice) : 50,
    status: item?.status ?? ('ACTIVE' as CoachListItem['status']),
  })

  const save = useMutation({
    mutationFn: () => {
      const specialties = form.specialties.split(',').map((s) => s.trim()).filter(Boolean)
      if (item) {
        return coachesApi.update(item.userId, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          bio: form.bio,
          specialties,
          sessionPrice: form.sessionPrice,
          status: form.status,
        })
      }
      return coachesApi.create({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        bio: form.bio,
        specialties,
        sessionPrice: form.sessionPrice,
        status: form.status,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaches'] })
      onClose()
    },
  })

  const invalid = !form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || (!item && form.password.length < 8)

  return (
    <Drawer
      title={item ? `${item.user.firstName} ${item.user.lastName}` : 'Nouveau coach'}
      subtitle={form.specialties || 'Fiche coach'}
      initials={item ? initials(item.user.firstName, item.user.lastName) : undefined}
      icon={item ? undefined : 'badge'}
      badge={item ? STATUS_OPTS.find((s) => s.v === form.status)?.l : undefined}
      badgeTone={STATUS_TONE[form.status]}
      onClose={onClose}
      footer={
        <button
          onClick={() => save.mutate()}
          disabled={invalid || save.isPending}
          className="h-10 flex-1 rounded-lg bg-(--color-primary) px-4 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover) disabled:opacity-50"
        >
          {item ? 'Enregistrer' : 'Ajouter'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Prénom
          <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Nom
          <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        E-mail
        <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)" />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Téléphone
        <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)" />
      </label>
      {!item ? (
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Mot de passe initial
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Spécialités (séparées par des virgules)
        <input
          value={form.specialties}
          onChange={(e) => setForm((f) => ({ ...f, specialties: e.target.value }))}
          placeholder="HIIT, Cross-training"
          className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Tarif coaching privé (DT/h)
          <input
            type="number"
            value={form.sessionPrice}
            onChange={(e) => setForm((f) => ({ ...f, sessionPrice: Number(e.target.value) }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3 text-sm outline-none focus:border-(--color-primary)"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Statut
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CoachListItem['status'] }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm"
          >
            {STATUS_OPTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Présentation (visible dans l’app)
        <textarea
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={3}
          className="resize-vertical rounded-lg border border-(--color-border-strong) px-3 py-2.5 text-sm outline-none focus:border-(--color-primary)"
        />
      </label>

      {item ? (
        <div className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface-2) px-3 py-2.5">
          <div>
            <div className="text-[13px] font-bold">Accès</div>
            <div className="text-xs text-(--color-muted)">Rôle Coach — droits communs à tous les coachs.</div>
          </div>
          <Link to="/roles" className="text-xs font-bold text-(--color-primary-ink) hover:underline">
            Gérer les rôles →
          </Link>
        </div>
      ) : null}
    </Drawer>
  )
}
