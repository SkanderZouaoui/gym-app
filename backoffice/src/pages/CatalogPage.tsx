import { useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { useClassTypes, useDeleteClassType, useDeleteRoom, useGalleryApi, useRooms, useSaveClassType, useSaveRoom, type ClassType, type Room } from '../api/catalog'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Icon, Modal, PageHeader, SectionHeader, Skeleton, useToast, cn } from '../components/ui'
import { GalleryManager } from '../components/domain/GalleryManager'

function Photos({ kind, item }: { kind: 'class-types' | 'rooms'; item: ClassType | Room }) {
  const api = useGalleryApi(kind, item.id)
  return <GalleryManager initial={item} api={api} />
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left hover:border-primary-border">
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="block text-[13px] text-muted">{hint}</span></span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-border-strong')}>
        <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

function ClassTypeModal({ item, onClose }: { item?: ClassType; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveClassType()
  const remove = useDeleteClassType()
  const [current, setCurrent] = useState<ClassType | undefined>(item)
  const [name, setName] = useState(item?.name ?? '')
  const [capacity, setCapacity] = useState(String(item?.defaultCapacity ?? 16))
  const [duration, setDuration] = useState(String(item?.defaultDurationMin ?? 45))
  const [active, setActive] = useState(item?.isActive ?? true)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = name.trim() && Number(capacity) >= 1 && Number(duration) >= 5

  return (
    <>
      <Modal
        title={current ? 'Modifier le type de cours' : 'Nouveau type de cours'}
        onClose={onClose}
        width="max-w-2xl"
        footer={
          <>
            {current ? <Button variant="danger" icon="delete" className="mr-auto" onClick={() => setConfirm(true)}>Supprimer</Button> : null}
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            <Button
              icon="check"
              disabled={!valid}
              loading={save.isPending}
              onClick={() =>
                save.mutate(
                  { id: current?.id, name: name.trim(), defaultCapacity: Number(capacity), defaultDurationMin: Number(duration), isActive: active },
                  {
                    onSuccess: (saved) => {
                      toast(current ? 'Type de cours enregistré' : 'Type de cours créé — vous pouvez ajouter des photos')
                      if (current) onClose()
                      else setCurrent(saved)
                    },
                    onError: (e) => setError(apiErrorMessage(e, "Enregistrement impossible. Réessayez.")),
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
          <Field label="Nom" icon="exercise" placeholder="Ex. Cross training" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capacité (places)" icon="groups" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} hint="Reprise par défaut à la création d’un cours." />
            <Field label="Durée (minutes)" icon="timelapse" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} hint="Reprise par défaut à la création d’un cours." />
          </div>
          <Toggle checked={active} onChange={setActive} label="Actif" hint="Un type inactif n’est plus proposé à la création d’un cours." />
          <section className="space-y-2.5">
            <SectionHeader title="Photos" icon="photo_library" />
            {current ? (
              <>
                <p className="text-sm text-muted">Affichées dans la fiche de chaque cours de ce type, dans l’application.</p>
                <Photos kind="class-types" item={current} />
              </>
            ) : (
              <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">Enregistrez d’abord le type de cours pour pouvoir ajouter des photos.</p>
            )}
          </section>
        </div>
      </Modal>
      {confirm && current ? (
        <ConfirmDialog
          danger
          title={`Supprimer « ${current.name} » ?`}
          message="S’il est déjà utilisé par des cours, il sera seulement désactivé ; sinon il est supprimé définitivement avec ses photos."
          confirmLabel="Supprimer"
          loading={remove.isPending}
          onClose={() => setConfirm(false)}
          onConfirm={() =>
            remove.mutate(current.id, {
              onSuccess: (r) => {
                toast(r.deactivated ? `« ${current.name} » est utilisé par des cours : il a été désactivé.` : 'Type de cours supprimé')
                onClose()
              },
              onError: (e) => {
                toast(apiErrorMessage(e), 'danger')
                setConfirm(false)
              },
            })
          }
        />
      ) : null}
    </>
  )
}

function RoomModal({ item, onClose }: { item?: Room; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveRoom()
  const remove = useDeleteRoom()
  const [current, setCurrent] = useState<Room | undefined>(item)
  const [name, setName] = useState(item?.name ?? '')
  const [capacity, setCapacity] = useState(String(item?.capacity ?? 20))
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = name.trim() && Number(capacity) >= 1

  return (
    <>
      <Modal
        title={current ? 'Modifier la salle' : 'Nouvelle salle'}
        onClose={onClose}
        width="max-w-2xl"
        footer={
          <>
            {current ? <Button variant="danger" icon="delete" className="mr-auto" onClick={() => setConfirm(true)}>Supprimer</Button> : null}
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            <Button
              icon="check"
              disabled={!valid}
              loading={save.isPending}
              onClick={() =>
                save.mutate(
                  { id: current?.id, name: name.trim(), capacity: Number(capacity) },
                  {
                    onSuccess: (saved) => {
                      toast(current ? 'Salle enregistrée' : 'Salle créée — vous pouvez ajouter des photos')
                      if (current) onClose()
                      else setCurrent(saved)
                    },
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de la salle" icon="meeting_room" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Field label="Capacité" icon="groups" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} />
          </div>
          <section className="space-y-2.5">
            <SectionHeader title="Photos" icon="photo_library" />
            {current ? (
              <>
                <p className="text-sm text-muted">Affichées dans le détail des cours donnés dans cette salle.</p>
                <Photos kind="rooms" item={current} />
              </>
            ) : (
              <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">Enregistrez d’abord la salle pour pouvoir ajouter des photos.</p>
            )}
          </section>
        </div>
      </Modal>
      {confirm && current ? (
        <ConfirmDialog
          danger
          title={`Supprimer « ${current.name} » ?`}
          message="Une salle utilisée par des cours ne peut pas être supprimée."
          confirmLabel="Supprimer"
          loading={remove.isPending}
          onClose={() => setConfirm(false)}
          onConfirm={() =>
            remove.mutate(current.id, {
              onSuccess: () => {
                toast('Salle supprimée')
                onClose()
              },
              onError: (e) => {
                toast(apiErrorMessage(e, 'Cette salle est utilisée par des cours.'), 'danger')
                setConfirm(false)
              },
            })
          }
        />
      ) : null}
    </>
  )
}

function Cover({ urls, icon }: { urls?: string[]; icon: string }) {
  return urls?.[0] ? (
    <img src={urls[0]} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
  ) : (
    <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-ink"><Icon name={icon} size={28} /></span>
  )
}

export function CatalogPage() {
  const types = useClassTypes()
  const rooms = useRooms()
  const [editType, setEditType] = useState<ClassType | 'new' | null>(null)
  const [editRoom, setEditRoom] = useState<Room | 'new' | null>(null)

  return (
    <div className="space-y-10">
      <PageHeader title="Cours et salles" subtitle="Types de cours, salles et leurs photos, visibles dans l’application." />

      <section className="space-y-3">
        <SectionHeader title="Types de cours" icon="exercise" action={<Button size="sm" icon="add" onClick={() => setEditType('new')}>Nouveau type</Button>} />
        {types.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : types.isError ? (
          <Card><ErrorState onRetry={() => void types.refetch()} /></Card>
        ) : (types.data ?? []).length === 0 ? (
          <Card><EmptyState icon="exercise" title="Aucun type de cours" hint="Créez vos types de cours (yoga, cross training…) pour planifier des séances." /></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(types.data ?? []).map((t) => (
              <button key={t.id} onClick={() => setEditType(t)} className={cn('flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary-border', !t.isActive && 'opacity-60')}>
                <Cover urls={t.galleryThumbUrls ?? t.galleryUrls} icon="exercise" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-head text-base font-bold">{t.name}</div>
                  <div className="mt-0.5 text-[13px] text-muted">{t.defaultCapacity} places · {t.defaultDurationMin} min</div>
                  <div className="mt-1.5 flex gap-1.5">
                    {!t.isActive ? <Badge tone="warning">Inactif</Badge> : null}
                    <Badge><Icon name="photo_library" size={13} />{t.galleryKeys.length}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Salles" icon="meeting_room" action={<Button size="sm" icon="add" onClick={() => setEditRoom('new')}>Nouvelle salle</Button>} />
        {rooms.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : rooms.isError ? (
          <Card><ErrorState onRetry={() => void rooms.refetch()} /></Card>
        ) : (rooms.data ?? []).length === 0 ? (
          <Card><EmptyState icon="meeting_room" title="Aucune salle" hint="Ajoutez les salles où se déroulent vos cours." /></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(rooms.data ?? []).map((r) => (
              <button key={r.id} onClick={() => setEditRoom(r)} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary-border">
                <Cover urls={r.galleryThumbUrls ?? r.galleryUrls} icon="meeting_room" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-head text-base font-bold">{r.name}</div>
                  <div className="mt-0.5 text-[13px] text-muted">{r.capacity} places</div>
                  <div className="mt-1.5"><Badge><Icon name="photo_library" size={13} />{r.galleryKeys.length}</Badge></div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {editType ? <ClassTypeModal item={editType === 'new' ? undefined : editType} onClose={() => setEditType(null)} /> : null}
      {editRoom ? <RoomModal item={editRoom === 'new' ? undefined : editRoom} onClose={() => setEditRoom(null)} /> : null}
    </div>
  )
}
