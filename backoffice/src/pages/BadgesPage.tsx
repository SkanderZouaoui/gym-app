import { useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { RULES, ruleText, useBadges, useDeleteBadge, useReorderBadges, useSaveBadge, type BadgeRule, type ProfileBadge } from '../api/badges'
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Icon, IconButton, Modal, PageHeader, SelectField, Skeleton, useToast, cn } from '../components/ui'

/** Icônes proposées (noms Material de l'application mobile). */
const ICONS = [
  'emoji-events', 'workspace-premium', 'military-tech', 'diamond', 'local-fire-department', 'bolt', 'star', 'verified',
  'fitness-center', 'directions-run', 'timer', 'trending-up', 'favorite', 'celebration', 'flag', 'shield',
]
/** Material Symbols attend des underscores. */
const sym = (name: string) => name.replace(/-/g, '_')

function BadgeTile({ icon, size = 56, dim }: { icon: string; size?: number; dim?: boolean }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-[18px] bg-gradient-to-br from-[#5b21b6] to-[#3b1764] text-white shadow-[0_8px_18px_rgba(91,33,182,0.3)]', dim && 'opacity-40 shadow-none')}
      style={{ width: size, height: size }}
    >
      <Icon name={sym(icon)} size={Math.round(size * 0.5)} />
    </span>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-border-strong')}>
      <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

function BadgeModal({ item, onClose }: { item?: ProfileBadge; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveBadge()
  const [labelFr, setLabelFr] = useState(item?.labelFr ?? '')
  const [labelEn, setLabelEn] = useState(item?.labelEn ?? '')
  const [labelAr, setLabelAr] = useState(item?.labelAr ?? '')
  const [icon, setIcon] = useState(item?.icon ?? 'emoji-events')
  const [rule, setRule] = useState<BadgeRule>(item?.rule ?? 'SESSIONS')
  const [threshold, setThreshold] = useState(String(item?.threshold ?? 10))
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const current = RULES.find((r) => r.value === rule)!
  const n = Number(threshold)
  const valid = labelFr.trim() && n >= 1 && n <= current.max

  return (
    <Modal
      title={item ? 'Modifier le badge' : 'Nouveau badge'}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button
            icon="check"
            disabled={!valid}
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                { id: item?.id, labelFr: labelFr.trim(), labelEn: labelEn.trim() || null, labelAr: labelAr.trim() || null, icon, rule, threshold: n, isActive },
                {
                  onSuccess: () => { toast(item ? 'Badge enregistré' : 'Badge créé'); onClose() },
                  onError: (e) => setError(apiErrorMessage(e, 'Enregistrement impossible. Réessayez.')),
                },
              )
            }
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}

        <div className="flex items-center gap-4 rounded-2xl bg-surface-2 p-4">
          <BadgeTile icon={icon} size={64} />
          <div className="min-w-0">
            <div className="truncate text-base font-extrabold">{labelFr.trim() || 'Nom du badge'}</div>
            <div className="text-sm text-muted">{ruleText(rule, n || 0)}</div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nom (français)" icon="badge" placeholder="Ex. 50 séances" value={labelFr} onChange={(e) => setLabelFr(e.target.value)} autoFocus />
          <Field label="Nom (anglais)" icon="translate" placeholder="Facultatif" value={labelEn} onChange={(e) => setLabelEn(e.target.value)} />
          <Field label="Nom (arabe)" icon="translate" placeholder="Facultatif" dir="rtl" value={labelAr} onChange={(e) => setLabelAr(e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-muted">Icône</div>
          <div className="grid grid-cols-8 gap-2">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                aria-label={i}
                onClick={() => setIcon(i)}
                className={cn('grid aspect-square place-items-center rounded-2xl border-[1.5px] transition', icon === i ? 'border-primary bg-primary-soft text-primary-ink' : 'border-border text-muted hover:border-primary-border')}
              >
                <Icon name={sym(i)} size={24} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Règle d’obtention" icon="rule" value={rule} onChange={(e) => setRule(e.target.value as BadgeRule)}>
            {RULES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </SelectField>
          <Field label={`Seuil (${current.unit})`} icon="flag" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value.replace(/\D/g, ''))} hint={current.hint} />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border p-3.5">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Actif</span>
            <span className="block text-[13px] text-muted">Un badge inactif n’apparaît pas dans le profil des adhérents.</span>
          </span>
          <Switch checked={isActive} onChange={setIsActive} label="Actif" />
        </div>
      </div>
    </Modal>
  )
}

/** Personnalisation des badges de la section « Badges » du profil adhérent : nom, icône, règle d'obtention, ordre. */
export function BadgesPage() {
  const toast = useToast()
  const { data, isLoading, isError, refetch } = useBadges()
  const reorder = useReorderBadges()
  const save = useSaveBadge()
  const remove = useDeleteBadge()
  const [editing, setEditing] = useState<ProfileBadge | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ProfileBadge | null>(null)
  const list = data ?? []

  const move = (index: number, dir: -1 | 1) => {
    const ids = list.map((b) => b.id)
    const target = index + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(ids, { onError: (e) => toast(apiErrorMessage(e), 'danger') })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Badges du profil"
        subtitle="Les badges que les adhérents peuvent débloquer, affichés dans leur profil sur l’application."
        actions={<Button icon="add" onClick={() => setEditing('new')}>Nouveau badge</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <Card><EmptyState icon="workspace_premium" title="Aucun badge" hint="Sans badge, la section « Badges » est masquée dans le profil des adhérents." action={<Button icon="add" onClick={() => setEditing('new')}>Créer un badge</Button>} /></Card>
      ) : (
        <div className="space-y-3">
          {list.map((b, i) => (
            <Card key={b.id} className={cn('flex items-center gap-4 p-4', !b.isActive && 'opacity-70')}>
              <BadgeTile icon={b.icon} dim={!b.isActive} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-extrabold">{b.labelFr}</div>
                <div className="mt-0.5 text-sm text-muted">{ruleText(b.rule, b.threshold)}</div>
                {b.labelEn || b.labelAr ? <div className="mt-0.5 truncate text-xs text-muted">{[b.labelEn, b.labelAr].filter(Boolean).join(' · ')}</div> : null}
              </div>
              <div className="flex items-center gap-1">
                <IconButton icon="keyboard_arrow_up" label="Monter" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} />
                <IconButton icon="keyboard_arrow_down" label="Descendre" disabled={i === list.length - 1 || reorder.isPending} onClick={() => move(i, 1)} />
              </div>
              <Switch
                checked={b.isActive}
                label={b.isActive ? 'Désactiver' : 'Activer'}
                onChange={(v) => save.mutate({ id: b.id, isActive: v }, { onError: (e) => toast(apiErrorMessage(e), 'danger') })}
              />
              <IconButton icon="edit" label="Modifier" onClick={() => setEditing(b)} />
              <IconButton icon="delete" label="Supprimer" className="text-danger-ink hover:bg-danger-soft" onClick={() => setDeleting(b)} />
            </Card>
          ))}
        </div>
      )}

      {editing ? <BadgeModal item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog
          title="Supprimer ce badge ?"
          message={`« ${deleting.labelFr} » disparaîtra du profil de tous les adhérents.`}
          confirmLabel="Supprimer"
          danger
          loading={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => { toast('Badge supprimé'); setDeleting(null) }, onError: (e) => toast(apiErrorMessage(e), 'danger') })}
        />
      ) : null}
    </div>
  )
}
