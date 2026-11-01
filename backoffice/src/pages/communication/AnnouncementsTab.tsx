import { useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { useAnnouncements, useDeleteAnnouncement, useSendAnnouncement, useUpdateAnnouncement, type Announcement, type AnnouncementAudience } from '../../api/content'
import { formatDate } from '../../lib/format'
import { Badge, Button, Card, ChipChoice, ConfirmDialog, EmptyState, ErrorState, Field, IconButton, Modal, SectionHeader, SelectField, Skeleton, TextArea, ToggleRow, useToast } from '../../components/ui'

const ANNOUNCEMENT_AUDIENCE: Record<AnnouncementAudience, string> = { MEMBERS: 'Adhérents', STAFF: 'Accueil', COACH: 'Coachs', TEAM: 'Équipe', ALL: 'Tout le monde' }
const TONES = [{ value: 'info', label: 'Information' }, { value: 'accent', label: 'Nouveauté' }, { value: 'danger', label: 'Important' }] as const
const today = () => new Date().toISOString().slice(0, 10)

function state(a: Announcement): { label: string; tone: 'success' | 'info' | 'muted' } {
  const t = today()
  if (a.startsOn && a.startsOn.slice(0, 10) > t) return { label: 'Programmée', tone: 'info' }
  if (a.endsOn && a.endsOn.slice(0, 10) < t) return { label: 'Terminée', tone: 'muted' }
  return { label: 'Publiée', tone: 'success' }
}

function Preview({ title, body, tone }: { title: string; body: string; tone: 'info' | 'accent' | 'danger' }) {
  const styles = { info: 'from-secondary to-black', accent: 'from-primary to-secondary', danger: 'from-danger to-secondary' }[tone]
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${styles} p-5 text-white`}>
      <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">{TONES.find((t) => t.value === tone)?.label}</span>
      <div className="mt-3 font-head text-lg font-bold">{title || 'Titre de l’annonce'}</div>
      <p className="mt-1 line-clamp-3 text-sm text-white/85">{body || 'Le message apparaîtra ici.'}</p>
    </div>
  )
}

function AnnouncementModal({ item, onClose }: { item?: Announcement; onClose: () => void }) {
  const toast = useToast()
  const send = useSendAnnouncement()
  const update = useUpdateAnnouncement()
  const [title, setTitle] = useState(item?.title ?? '')
  const [body, setBody] = useState(item?.body ?? '')
  const [tone, setTone] = useState<Announcement['tone']>(item?.tone ?? 'info')
  const [audience, setAudience] = useState<AnnouncementAudience>(item?.audience ?? 'MEMBERS')
  const [startsOn, setStartsOn] = useState(item?.startsOn?.slice(0, 10) ?? today())
  const [endsOn, setEndsOn] = useState(item?.endsOn?.slice(0, 10) ?? '')
  const [push, setPush] = useState(item?.push ?? true)
  const [error, setError] = useState<string | null>(null)
  const valid = title.trim() && body.trim()

  const submit = () => {
    const common = { title: title.trim(), body: body.trim(), startsOn: startsOn || undefined }
    if (item) {
      update.mutate(
        { id: item.id, ...common, endsOn: endsOn || null },
        { onSuccess: () => { toast('Annonce modifiée'); onClose() }, onError: (e) => setError(apiErrorMessage(e, 'La modification a échoué. Réessayez.')) },
      )
    } else {
      send.mutate(
        { ...common, tone, audience, endsOn: endsOn || undefined, push },
        { onSuccess: (r) => { toast(push ? `Publiée et envoyée en push à ${r.recipientCount} personne${r.recipientCount > 1 ? 's' : ''}` : 'Annonce publiée'); onClose() }, onError: (e) => setError(apiErrorMessage(e, "L'annonce n'a pas pu être publiée. Réessayez.")) },
      )
    }
  }

  return (
    <Modal
      title={item ? "Modifier l'annonce" : 'Nouvelle annonce'}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button icon={item ? 'check' : 'send'} disabled={!valid} loading={send.isPending || update.isPending} onClick={submit}>{item ? 'Enregistrer' : 'Publier'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
        <Field label="Titre" icon="title" placeholder="Ex. Fermeture exceptionnelle" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <TextArea label="Message" icon="notes" placeholder="Votre message aux adhérents" value={body} onChange={(e) => setBody(e.target.value)} />
        {!item ? (
          <>
            <Card className="overflow-hidden"><ChipChoice label="Style" hint="Couleur du bandeau sur l’accueil" value={tone} options={[...TONES]} onChange={setTone} /></Card>
            <SelectField label="Destinataires" icon="groups" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
              {Object.entries(ANNOUNCEMENT_AUDIENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </SelectField>
          </>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Début" icon="event" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          <Field label="Fin (facultatif)" icon="event_busy" type="date" min={startsOn} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </div>
        {!item ? <Card className="overflow-hidden"><ToggleRow label="Envoyer une notification push" hint="En plus du message sur l’accueil" checked={push} onChange={setPush} /></Card> : <p className="text-[13px] text-muted">Les notifications déjà envoyées ne sont pas modifiées.</p>}
        <Preview title={title} body={body} tone={tone} />
      </div>
    </Modal>
  )
}

/** Annonces : message sur l'accueil des adhérents pendant une période, avec notification push facultative. */
export function AnnouncementsTab() {
  const toast = useToast()
  const { data, isLoading, isError, refetch } = useAnnouncements()
  const remove = useDeleteAnnouncement()
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Announcement | null>(null)

  return (
    <div className="space-y-4">
      <SectionHeader title="Annonces" icon="campaign" action={<Button size="sm" icon="add" onClick={() => setEditing('new')}>Nouvelle annonce</Button>} />
      <p className="-mt-2 text-sm text-muted">Affichées sur l’écran d’accueil des adhérents, avec une notification push en option.</p>
      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : isError ? <Card><ErrorState onRetry={() => void refetch()} /></Card> : (data ?? []).length === 0 ? (
        <Card><EmptyState icon="campaign" title="Aucune annonce pour le moment" hint="Informez vos adhérents d’une fermeture, d’une nouveauté ou d’une offre." /></Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {(data ?? []).map((a) => {
            const s = state(a)
            return (
              <div key={a.id} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-head text-base font-bold">{a.title}</span>
                    <Badge tone={s.tone} dot>{s.label}</Badge>
                    {a.push ? <Badge tone="primary">Push</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                  <div className="mt-1.5 text-xs text-muted">{ANNOUNCEMENT_AUDIENCE[a.audience ?? 'MEMBERS']} · {a.startsOn ? formatDate(a.startsOn, { day: 'numeric', month: 'short' }) : '…'} → {a.endsOn ? formatDate(a.endsOn, { day: 'numeric', month: 'short' }) : '…'}</div>
                </div>
                <IconButton icon="edit" label="Modifier l’annonce" onClick={() => setEditing(a)} />
                <IconButton icon="delete" label="Supprimer l’annonce" className="text-danger-ink hover:bg-danger-soft" onClick={() => setDeleting(a)} />
              </div>
            )
          })}
        </Card>
      )}
      {editing ? <AnnouncementModal item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog danger title={`Supprimer « ${deleting.title} » ?`} message="L’annonce disparaîtra de l’accueil des adhérents." confirmLabel="Supprimer" loading={remove.isPending} onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => { toast('Annonce supprimée'); setDeleting(null) }, onError: (e) => toast(apiErrorMessage(e), 'danger') })} />
      ) : null}
    </div>
  )
}
