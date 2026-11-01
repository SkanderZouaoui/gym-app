import { useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { useDeleteHomeAlert, useHomeAlerts, useSaveHomeAlert, type AlertAudience, type HomeAlert } from '../../api/content'
import { formatDate } from '../../lib/format'
import { Badge, Button, Card, ChipChoice, ConfirmDialog, EmptyState, ErrorState, Field, Icon, IconButton, Modal, SectionHeader, SelectField, Skeleton, TextArea, useToast } from '../../components/ui'

const LEVELS = [{ value: 'info', label: 'Information' }, { value: 'warn', label: 'Avertissement' }, { value: 'urgent', label: 'Urgent' }] as const
const AUDIENCES: AlertAudience[] = ['Tous', 'Actifs', 'Expirés', 'Équipe', 'Accueil', 'Coachs']
const LEVEL_STYLE = { info: 'bg-info-soft text-info-ink', warn: 'bg-warning-soft text-warning-ink', urgent: 'bg-danger-soft text-danger-ink' }
const LEVEL_ICON = { info: 'info', warn: 'warning', urgent: 'error' }
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

function AlertModal({ item, onClose }: { item?: HomeAlert; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveHomeAlert()
  const [title, setTitle] = useState(item?.title ?? '')
  const [message, setMessage] = useState(item?.message ?? '')
  const [level, setLevel] = useState<HomeAlert['level']>(item?.level ?? 'info')
  const [audience, setAudience] = useState<AlertAudience>(item?.audience ?? 'Tous')
  const [startsOn, setStartsOn] = useState(item?.startsOn.slice(0, 10) ?? day(0))
  const [endsOn, setEndsOn] = useState(item?.endsOn.slice(0, 10) ?? day(7))
  const [error, setError] = useState<string | null>(null)
  const valid = title.trim() && message.trim() && startsOn && endsOn && endsOn >= startsOn

  return (
    <Modal
      title={item ? "Modifier l'alerte" : 'Nouvelle alerte'}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            icon="check"
            disabled={!valid}
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                { id: item?.id, data: { title: title.trim(), message: message.trim(), level, audience, startsOn, endsOn, isActive: item?.isActive ?? true } },
                { onSuccess: () => { toast(item ? 'Alerte enregistrée' : 'Alerte publiée'); onClose() }, onError: (e) => setError(apiErrorMessage(e, "Impossible d'enregistrer l'alerte.")) },
              )
            }
          >
            {item ? 'Enregistrer' : 'Publier'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
        <Card className="overflow-hidden"><ChipChoice label="Niveau" value={level} options={[...LEVELS]} onChange={setLevel} /></Card>
        <Field label="Titre" icon="title" placeholder="Ex. Fermeture exceptionnelle" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <TextArea label="Message" icon="notes" placeholder="Votre message aux adhérents" value={message} onChange={(e) => setMessage(e.target.value)} />
        <SelectField label="Audience" icon="groups" value={audience} onChange={(e) => setAudience(e.target.value as AlertAudience)}>
          {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Début" icon="event" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          <Field label="Fin" icon="event_busy" type="date" min={startsOn} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </div>
        <div className={`flex gap-3 rounded-2xl p-4 ${LEVEL_STYLE[level]}`}>
          <Icon name={LEVEL_ICON[level]} size={22} />
          <div><div className="font-bold">{title || "Titre de l'alerte"}</div><div className="text-sm opacity-90">{message || 'Votre message aux adhérents'}</div></div>
        </div>
      </div>
    </Modal>
  )
}

/** Alertes adhérents : bandeaux d'information, d'avertissement ou d'urgence en haut de l'accueil de l'app. */
export function AlertsTab() {
  const toast = useToast()
  const { data, isLoading, isError, refetch } = useHomeAlerts()
  const save = useSaveHomeAlert()
  const remove = useDeleteHomeAlert()
  const [editing, setEditing] = useState<HomeAlert | 'new' | null>(null)
  const [deleting, setDeleting] = useState<HomeAlert | null>(null)

  return (
    <div className="space-y-4">
      <SectionHeader title="Alertes adhérents" icon="notification_important" action={<Button size="sm" icon="add" onClick={() => setEditing('new')}>Nouvelle alerte</Button>} />
      <p className="-mt-2 text-sm text-muted">Bandeaux affichés en haut de l’accueil de l’application, pendant une période.</p>
      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : isError ? <Card><ErrorState onRetry={() => void refetch()} /></Card> : (data ?? []).length === 0 ? (
        <Card><EmptyState icon="notification_important" title="Aucune alerte" hint="Prévenez vos adhérents d’un événement important." /></Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {(data ?? []).map((a) => (
            <div key={a.id} className="flex items-start gap-4 px-5 py-4">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${LEVEL_STYLE[a.level]}`}><Icon name={LEVEL_ICON[a.level]} size={22} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-head text-base font-bold">{a.title}</span>
                  <Badge tone={a.isActive ? 'success' : 'muted'} dot>{a.isActive ? 'Active' : 'Désactivée'}</Badge>
                  <Badge>{a.audience}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{a.message}</p>
                <div className="mt-1.5 text-xs text-muted">{formatDate(a.startsOn, { day: 'numeric', month: 'short' })} → {formatDate(a.endsOn, { day: 'numeric', month: 'short' })}</div>
              </div>
              <IconButton icon={a.isActive ? 'visibility_off' : 'visibility'} label={a.isActive ? 'Désactiver' : 'Activer'} onClick={() => save.mutate({ id: a.id, data: { isActive: !a.isActive } }, { onError: (e) => toast(apiErrorMessage(e), 'danger') })} />
              <IconButton icon="edit" label="Modifier l’alerte" onClick={() => setEditing(a)} />
              <IconButton icon="delete" label="Supprimer l’alerte" className="text-danger-ink hover:bg-danger-soft" onClick={() => setDeleting(a)} />
            </div>
          ))}
        </Card>
      )}
      {editing ? <AlertModal item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog danger title={`Supprimer « ${deleting.title} » ?`} message="L’alerte disparaîtra de l’accueil des adhérents." confirmLabel="Supprimer" loading={remove.isPending} onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => { toast('Alerte supprimée'); setDeleting(null) }, onError: (e) => toast(apiErrorMessage(e), 'danger') })} />
      ) : null}
    </div>
  )
}
