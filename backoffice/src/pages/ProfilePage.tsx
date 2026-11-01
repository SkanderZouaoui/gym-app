import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { changePassword, uploadAvatar, useMyProfile, useUpdateProfile } from '../api/me'
import { useAuth } from '../store/auth'
import { ROLE_LABEL } from '../lib/roles'
import { Avatar, Badge, Button, Card, ConfirmDialog, Field, Icon, PageHeader, SectionHeader, useToast } from '../components/ui'
import { ImageEditor } from '../components/domain/ImageEditor'

/** Mon profil : informations personnelles, photo, mot de passe — comme l'écran profil du mobile pour l'accueil et l'admin. */
export function ProfilePage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user, roles, activeRole, logout } = useAuth()
  const { data: profile } = useMyProfile()
  const update = useUpdateProfile()
  const input = useRef<HTMLInputElement>(null)
  const [editingPhoto, setEditingPhoto] = useState<File | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [lastName, setLastName] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdBusy, setPwdBusy] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  if (!user) return null
  const f = firstName ?? user.firstName
  const l = lastName ?? user.lastName
  const p = phone ?? profile?.phone ?? ''
  const dirty = f !== user.firstName || l !== user.lastName || p !== (profile?.phone ?? '')

  const savePhoto = async (file: File) => {
    setEditingPhoto(null)
    setPhotoBusy(true)
    try {
      const key = await uploadAvatar(file)
      await update.mutateAsync({ photoKey: key })
      toast('Photo de profil enregistrée')
      window.location.reload() // l'URL signée de la nouvelle photo vient du serveur
    } catch (e) {
      toast(apiErrorMessage(e, "Impossible d'enregistrer la photo."), 'danger')
      setPhotoBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Mon profil" subtitle="Vos informations et votre sécurité." />

      <Card className="flex flex-wrap items-center gap-5 p-6">
        <button onClick={() => input.current?.click()} disabled={photoBusy} className="relative shrink-0" aria-label="Changer la photo de profil">
          <Avatar firstName={user.firstName} lastName={user.lastName} photoUrl={user.photoUrl} size={88} />
          <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-[3px] border-surface bg-primary text-white">
            <Icon name={photoBusy ? 'progress_activity' : 'photo_camera'} size={16} className={photoBusy ? 'animate-spin' : ''} />
          </span>
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setEditingPhoto(e.target.files[0]); e.target.value = '' }} />
        <div className="min-w-0 flex-1">
          <div className="font-head text-2xl font-bold">{user.firstName} {user.lastName}</div>
          <div className="text-sm text-muted">{user.email}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">{roles.map((r) => <Badge key={r} tone={r === activeRole ? 'primary' : 'muted'} dot={r === activeRole}>{ROLE_LABEL[r]}</Badge>)}</div>
        </div>
      </Card>

      <section className="space-y-3">
        <SectionHeader title="Informations personnelles" icon="person" />
        <Card className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" icon="person" value={f} onChange={(e) => setFirstName(e.target.value)} />
            <Field label="Nom" icon="badge" value={l} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Téléphone" icon="call" inputMode="tel" placeholder="22 222 222" value={p} onChange={(e) => setPhone(e.target.value)} />
            <Field label="E-mail" icon="mail" value={user.email ?? ''} readOnly hint="L’adresse e-mail se change depuis l’application." />
          </div>
          <div className="flex justify-end">
            <Button icon="check" disabled={!dirty || !f.trim() || !l.trim()} loading={update.isPending} onClick={() => update.mutate({ firstName: f.trim(), lastName: l.trim(), phone: p.trim() }, { onSuccess: () => { setFirstName(null); setLastName(null); setPhone(null); toast('Profil enregistré') }, onError: (e) => toast(apiErrorMessage(e), 'danger') })}>Enregistrer</Button>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Mot de passe" icon="lock" />
        <Card className="space-y-4 p-6">
          {pwdError ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{pwdError}</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mot de passe actuel" icon="lock" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            <Field label="Nouveau mot de passe" icon="key" type="password" autoComplete="new-password" hint="8 caractères minimum" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button
              icon="lock_reset"
              disabled={current.length < 8 || next.length < 8}
              loading={pwdBusy}
              onClick={async () => {
                setPwdBusy(true)
                setPwdError(null)
                try {
                  await changePassword(current, next)
                  setCurrent('')
                  setNext('')
                  toast('Mot de passe modifié')
                } catch (e) {
                  setPwdError(apiErrorMessage(e, 'Mot de passe actuel incorrect.'))
                } finally {
                  setPwdBusy(false)
                }
              }}
            >
              Modifier le mot de passe
            </Button>
          </div>
        </Card>
      </section>

      <Button variant="danger" icon="logout" onClick={() => setConfirmLogout(true)}>Se déconnecter</Button>

      {editingPhoto ? <ImageEditor source={editingPhoto} fileName="profil" title="Photo de profil" confirmLabel="Enregistrer" defaultRatio={1} onCancel={() => setEditingPhoto(null)} onDone={(file) => void savePhoto(file)} /> : null}
      {confirmLogout ? <ConfirmDialog title="Se déconnecter ?" message="Vous devrez vous reconnecter pour accéder au back-office." confirmLabel="Se déconnecter" onClose={() => setConfirmLogout(false)} onConfirm={async () => { await logout(); navigate('/login', { replace: true }) }} /> : null}
    </div>
  )
}
