import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Role } from '@muscleup/shared'
import { teamApi, type TeamMemberItem } from '../api/endpoints'
import { Drawer } from './ui/Drawer'

const ROLE_OPTS: { v: 'STAFF' | 'ADMIN'; l: string }[] = [
  { v: 'STAFF', l: 'Accueil' },
  { v: 'ADMIN', l: 'Admin' },
]

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

function currentRole(roles: { role: Role }[]): 'STAFF' | 'ADMIN' {
  return roles.some((r) => r.role === 'ADMIN') ? 'ADMIN' : 'STAFF'
}

export function TeamDrawer({ item, onClose }: { item: TeamMemberItem | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    firstName: item?.firstName ?? '',
    lastName: item?.lastName ?? '',
    email: item?.email ?? '',
    phone: item?.phone ?? '',
    password: '',
    status: (item?.status ?? 'ACTIVE') as 'ACTIVE' | 'SUSPENDED',
    role: item ? currentRole(item.roles) : ('STAFF' as 'STAFF' | 'ADMIN'),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['team'] })

  const save = useMutation({
    mutationFn: async () => {
      if (item) {
        const before = currentRole(item.roles)
        if (before !== form.role) {
          await teamApi.assignRole(item.id, form.role)
          await teamApi.revokeRole(item.id, before)
        }
        return teamApi.update(item.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          status: form.status,
        })
      }
      return teamApi.create({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: form.role,
      })
    },
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  const remove = useMutation({
    mutationFn: () => teamApi.delete(item!.id),
    onSuccess: () => {
      invalidate()
      onClose()
    },
  })

  const invalid = !form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || (!item && form.password.length < 8)

  return (
    <Drawer
      title={item ? `${item.firstName} ${item.lastName}` : 'Nouveau compte équipe'}
      subtitle={item?.email ?? 'Compte interne (Accueil ou Admin)'}
      initials={initials(form.firstName || '?', form.lastName || '?')}
      badge={ROLE_OPTS.find((r) => r.v === form.role)?.l}
      badgeTone={form.role === 'ADMIN' ? 'secondary' : 'info'}
      onClose={onClose}
      onDelete={item ? () => remove.mutate() : undefined}
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
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Rôle
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'STAFF' | 'ADMIN' }))}
            className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm"
          >
            {ROLE_OPTS.map((r) => (
              <option key={r.v} value={r.v}>
                {r.l}
              </option>
            ))}
          </select>
        </label>
        {item ? (
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Statut
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'ACTIVE' | 'SUSPENDED' }))}
              className="h-10 rounded-lg border border-(--color-border-strong) px-2.5 text-sm"
            >
              <option value="ACTIVE">Actif</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
          </label>
        ) : null}
      </div>

      {item ? (
        <div className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface-2) px-3 py-2.5">
          <div>
            <div className="text-[13px] font-bold">Accès</div>
            <div className="text-xs text-(--color-muted)">
              Droits du rôle {ROLE_OPTS.find((r) => r.v === form.role)?.l}.
            </div>
          </div>
          <Link to="/roles" className="text-xs font-bold text-(--color-primary-ink) hover:underline">
            Gérer les rôles →
          </Link>
        </div>
      ) : null}
    </Drawer>
  )
}
