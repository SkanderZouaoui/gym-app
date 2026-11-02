import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import {
  DEFAULT_ATTENDANCE_POLICY,
  resolveLocation,
  useAttendancePolicy,
  useOrganizationConfig,
  useUpdateAttendancePolicy,
  useUpdateOrganizationConfig,
  useVenueIdentity,
  useVenueLogo,
  type AttendancePolicy,
  type OrganizationConfig,
} from '../api/admin'
import { useGalleryApi } from '../api/catalog'
import { METHOD_ICON, METHOD_LABEL, type PaymentMethod } from '../lib/format'
import { Button, Card, ChipChoice, Field, Icon, PageHeader, SectionHeader, Skeleton, Stepper, ToggleRow, useToast, cn } from '../components/ui'
import { GalleryManager } from '../components/domain/GalleryManager'
import { OccupancySettingsForm } from '../components/domain/OccupancySettingsForm'
import { formFrom, payloadFrom, type OccupancyForm } from '../lib/occupancyForm'
import { useOccupancySettings, useSaveOccupancySettings } from '../api/occupancy'
import { ImageEditor } from '../components/domain/ImageEditor'

type Section = 'venue' | 'booking' | 'occupancy' | 'payments' | 'comms'
const SECTIONS: { id: Section; label: string; sub: string; icon: string }[] = [
  { id: 'venue', label: 'Salle et horaires', sub: 'Identité, coordonnées et horaires d’ouverture', icon: 'storefront' },
  { id: 'booking', label: 'Réservation et présence', sub: 'Annulation, liste d’attente, période de scan', icon: 'event_available' },
  { id: 'occupancy', label: 'Présence et occupation', sub: 'WiFi de la salle, pondération et réglage manuel', icon: 'groups' },
  { id: 'payments', label: 'Paiements', sub: 'Moyens de paiement acceptés', icon: 'payments' },
  { id: 'comms', label: 'Annonces et alertes', sub: 'Format, notifications push et rappels', icon: 'campaign' },
]
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const FORMATS = [{ value: 'Bandeau', label: 'Bandeau' }, { value: 'Pop-up', label: 'Pop-up' }, { value: 'Encart', label: 'Encart' }] as const
const PAYMENTS: { key: PaymentMethod; sub: string }[] = [
  { key: 'CASH', sub: 'Encaissement au comptoir' },
  { key: 'OTHER', sub: 'Terminal de paiement' },
  { key: 'TRANSFER', sub: 'Sur justificatif' },
  { key: 'CHECK', sub: 'À l’ordre de la salle' },
]

function Group({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionHeader title={title} icon={icon} />
      <Card className="divide-y divide-border overflow-hidden">{children}</Card>
    </section>
  )
}

function Logo() {
  const toast = useToast()
  const { data } = useVenueIdentity()
  const api = useVenueLogo()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<File | null>(null)
  const send = async (file: File) => {
    setEditing(null)
    setBusy(true)
    try {
      await api.upload(file)
      toast('Logo enregistré')
    } catch (e) {
      toast(apiErrorMessage(e, "Impossible d'enregistrer le logo."), 'danger')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <button onClick={() => input.current?.click()} disabled={busy} className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-surface-2" aria-label="Importer un logo">
        {data?.logoUrl ? <img src={data.logoUrl} alt="Logo" className="size-16 object-contain" /> : <Icon name="add_photo_alternate" size={30} className="text-primary-ink" />}
        {busy ? <span className="absolute inset-0 grid place-items-center bg-white/70"><Icon name="progress_activity" className="animate-spin" /></span> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">Logo</div>
        <div className="text-[13px] text-muted">Affiché sur la fiche de la salle dans l’application (PNG, JPEG ou WebP).</div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="soft" icon="upload" onClick={() => input.current?.click()} disabled={busy}>{data?.logoUrl ? 'Changer' : 'Importer'}</Button>
          {data?.logoUrl ? <Button size="sm" variant="ghost" icon="delete" onClick={() => void api.remove().then(() => toast('Logo retiré'))}>Retirer</Button> : null}
        </div>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && setEditing(e.target.files[0])} />
      {editing ? <ImageEditor source={editing} fileName={editing.name} title="Logo de la salle" confirmLabel="Enregistrer" onSkip={() => void send(editing)} onCancel={() => { setEditing(null); if (input.current) input.current.value = '' }} onDone={(f) => void send(f)} /> : null}
    </div>
  )
}

function Position({ cfg, patch }: { cfg: OrganizationConfig; patch: (c: OrganizationConfig) => void }) {
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { latitude, longitude } = cfg.contact
  const has = latitude != null && longitude != null
  const set = (lat: number | null, lng: number | null) => patch({ ...cfg, contact: { ...cfg.contact, latitude: lat, longitude: lng } })

  const apply = async (text: string) => {
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      const pos = await resolveLocation(text.trim())
      set(Math.round(pos.latitude * 1e6) / 1e6, Math.round(pos.longitude * 1e6) / 1e6)
      setLink('')
    } catch {
      setError('Aucune position trouvée. Copiez le lien depuis Google Maps (Partager → Copier le lien) ou des coordonnées « 36.80, 10.18 ».')
    } finally {
      setBusy(false)
    }
  }
  const useHere = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => set(Math.round(p.coords.latitude * 1e6) / 1e6, Math.round(p.coords.longitude * 1e6) / 1e6),
      () => setError('Localisation refusée par le navigateur.'),
    )

  return (
    <div className="space-y-3 px-5 py-4">
      <div>
        <div className="text-sm font-bold">Position sur la carte</div>
        <div className="text-[13px] text-muted">Les adhérents voient une carte et un bouton d’itinéraire. {has ? `${latitude!.toFixed(5)}, ${longitude!.toFixed(5)}` : 'Position non définie.'}</div>
      </div>
      {has ? (
        <iframe
          title="Carte"
          className="h-56 w-full rounded-2xl border border-border"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude! - 0.004},${latitude! - 0.0025},${longitude! + 0.004},${latitude! + 0.0025}&layer=mapnik&marker=${latitude},${longitude}`}
        />
      ) : null}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void apply(link)
        }}
      >
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Collez un lien Google Maps ou des coordonnées" className="h-11 min-w-64 flex-1 rounded-full border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary" />
        <Button type="submit" icon="check" loading={busy} disabled={!link.trim()}>Valider</Button>
        <Button type="button" variant="soft" icon="my_location" onClick={useHere}>Ma position</Button>
        {has ? <Button type="button" variant="ghost" icon="delete" onClick={() => set(null, null)}>Effacer</Button> : null}
      </form>
      {error ? <p role="alert" className="flex items-start gap-1.5 text-[13px] font-semibold text-warning-ink"><Icon name="info" size={16} />{error}</p> : null}
    </div>
  )
}

function VenueGallery() {
  const { data } = useVenueIdentity()
  const api = useGalleryApi('organization', 'venue')
  if (!data) return <div className="p-5"><Skeleton className="h-32" /></div>
  return (
    <div className="space-y-2.5 px-5 py-4">
      <p className="text-sm text-muted">Accueil, salles, vestiaires… Jusqu’à 12 photos, visibles sur la fiche de la salle.</p>
      <GalleryManager initial={data.gallery} api={api} />
    </div>
  )
}

export function SettingsPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const section = (SECTIONS.find((s) => s.id === params.get('section'))?.id ?? 'venue') as Section
  const configQuery = useOrganizationConfig()
  const policyQuery = useAttendancePolicy()
  const saveConfig = useUpdateOrganizationConfig()
  const savePolicy = useUpdateAttendancePolicy()
  const [cfgDraft, setCfgDraft] = useState<OrganizationConfig | null>(null)
  const [policyDraft, setPolicyDraft] = useState<AttendancePolicy | null>(null)
  const occQuery = useOccupancySettings()
  const saveOcc = useSaveOccupancySettings()
  const [occDraft, setOccDraft] = useState<OccupancyForm | null>(null)
  const cfg = cfgDraft ?? configQuery.data
  const policy = policyDraft ?? policyQuery.data ?? DEFAULT_ATTENDANCE_POLICY
  const dirty = !!cfgDraft || !!policyDraft || !!occDraft
  const saving = saveConfig.isPending || savePolicy.isPending || saveOcc.isPending

  // Avertit avant de quitter la page avec des modifications non enregistrées.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const patchPolicy = (p: Partial<AttendancePolicy>) => setPolicyDraft({ ...policy, ...p })
  const save = async () => {
    try {
      if (cfgDraft) await saveConfig.mutateAsync(cfgDraft)
      if (policyDraft) await savePolicy.mutateAsync(policyDraft)
      if (occDraft) await saveOcc.mutateAsync(payloadFrom(occDraft))
      setCfgDraft(null)
      setPolicyDraft(null)
      setOccDraft(null)
      toast('Réglages enregistrés')
    } catch (e) {
      const code = (e as { response?: { data?: { code?: string } } }).response?.data?.code
      toast(code === 'INVALID_PUBLIC_IP' ? 'Adresse IP invalide.' : code === 'OVERRIDE_DEFAULT_EXCEEDS_MAX' ? 'La durée par défaut dépasse la durée maximale.' : apiErrorMessage(e, 'Enregistrement impossible. Réessayez.'), 'danger')
    }
  }

  const current = SECTIONS.find((s) => s.id === section)!
  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="Réglages" subtitle="Configuration de la salle, partagée avec l’application." />
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Sections">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setParams({ section: s.id }, { replace: true })} className={cn('flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition lg:w-full', s.id === section ? 'bg-surface text-primary-ink shadow-card' : 'text-muted hover:bg-surface-2')}>
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', s.id === section ? 'bg-primary-soft' : 'bg-surface-2')}><Icon name={s.icon} size={20} /></span>
              <span className="text-sm font-bold">{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-8">
          <div>
            <h2 className="text-xl">{current.label}</h2>
            <p className="text-sm text-muted">{current.sub}</p>
          </div>
          {!cfg ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : section === 'venue' ? (
            <>
              <Group title="Identité" icon="badge">
                <div className="p-5"><Field label="Nom de la salle" icon="storefront" value={cfg.contact.name} onChange={(e) => setCfgDraft({ ...cfg, contact: { ...cfg.contact, name: e.target.value } })} /></div>
                <Logo />
              </Group>
              <Group title="Coordonnées" icon="contact_phone">
                <Position cfg={cfg} patch={setCfgDraft} />
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Field label="Téléphone" icon="call" inputMode="tel" placeholder="22 222 222" value={cfg.contact.phone} onChange={(e) => setCfgDraft({ ...cfg, contact: { ...cfg.contact, phone: e.target.value } })} />
                  <Field label="E-mail" icon="mail" type="email" value={cfg.contact.email} onChange={(e) => setCfgDraft({ ...cfg, contact: { ...cfg.contact, email: e.target.value } })} />
                </div>
                <ToggleRow label="Visible par les adhérents" hint="Affiche le téléphone, l’e-mail et la carte dans l’application. Les horaires et les photos restent toujours visibles." checked={cfg.contact.visibleToMembers} onChange={(v) => setCfgDraft({ ...cfg, contact: { ...cfg.contact, visibleToMembers: v } })} />
              </Group>
              <Group title="Horaires d’ouverture" icon="schedule">
                {cfg.hours.map((h, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <div className="w-28">
                      <div className="text-sm font-bold">{DAYS[i]}</div>
                      <div className={cn('text-[13px]', h.open ? 'font-semibold text-success-ink' : 'text-muted')}>{h.open ? 'Ouvert' : 'Fermé'}</div>
                    </div>
                    <button role="switch" aria-checked={h.open} aria-label={`Ouvert le ${DAYS[i].toLowerCase()}`} onClick={() => setCfgDraft({ ...cfg, hours: cfg.hours.map((x, j) => (j === i ? { ...x, open: !x.open } : x)) })} className={cn('relative h-7 w-12 shrink-0 rounded-full transition', h.open ? 'bg-primary' : 'bg-border-strong')}>
                      <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', h.open ? 'left-[22px]' : 'left-0.5')} />
                    </button>
                    {h.open ? (
                      <div className="flex items-center gap-2">
                        {(['from', 'to'] as const).map((k, n) => (
                          <label key={k} className="flex items-center gap-2 rounded-2xl border-[1.5px] border-primary-border px-3 py-1.5 focus-within:border-primary">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{k === 'from' ? 'Début' : 'Fin'}</span>
                            <input type="time" value={h[k]} onChange={(e) => setCfgDraft({ ...cfg, hours: cfg.hours.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} className="bg-transparent font-head text-base font-bold outline-none" />
                            {n === 0 ? <Icon name="arrow_forward" size={16} className="-mr-1 ml-1 text-muted" /> : null}
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </Group>
              <Group title="Photos de la salle" icon="photo_library">
                <VenueGallery />
              </Group>
            </>
          ) : section === 'booking' ? (
            <>
              <Group title="Réservation" icon="event_available">
                <Stepper label="Annulation possible" hint="Jusqu’à ce délai avant le cours" value={cfg.booking.cancelHoursBefore} unit="h" min={0} max={72} onChange={(v) => setCfgDraft({ ...cfg, booking: { ...cfg.booking, cancelHoursBefore: v } })} />
                <Stepper label="Capacité par défaut" hint="Nouveaux cours" value={cfg.booking.defaultCapacity} unit="pl." min={1} max={200} onChange={(v) => setCfgDraft({ ...cfg, booking: { ...cfg.booking, defaultCapacity: v } })} />
                <ToggleRow label="Liste d’attente" hint="Quand un cours est complet" checked={cfg.booking.waitlist} onChange={(v) => setCfgDraft({ ...cfg, booking: { ...cfg.booking, waitlist: v } })} />
              </Group>
              <Group title="Période de scan" icon="qr_code_scanner">
                <Stepper label="Ouverture avant le cours" hint="Le pointage s’ouvre avant le début" value={policy.scanOpensMinutesBefore} unit="min" min={0} max={120} step={5} onChange={(v) => patchPolicy({ scanOpensMinutesBefore: v })} />
                <Stepper label="Fermeture après le début" hint="Au-delà, le scan est refusé" value={policy.scanClosesMinutesAfterStart} unit="min" min={0} max={180} step={5} onChange={(v) => patchPolicy({ scanClosesMinutesAfterStart: v })} />
                <ToggleRow label="Accepter sans réservation" hint="Inscrit et pointe sur place si des places restent" checked={policy.allowWalkIn} onChange={(v) => patchPolicy({ allowWalkIn: v })} />
                <Stepper label="Délai avant absence" hint="Après le début, une réservation non pointée devient une absence" value={policy.noShowGraceMinutes} unit="min" min={0} max={240} step={5} onChange={(v) => patchPolicy({ noShowGraceMinutes: v })} />
                <ToggleRow label="L’accueil peut encaisser" hint="Autorise le rôle accueil à enregistrer des paiements" checked={policy.staffCanRecordPayments} onChange={(v) => patchPolicy({ staffCanRecordPayments: v })} />
              </Group>
              <Group title="Absences" icon="person_off">
                <ToggleRow label="Bloquer les réservations" hint="Après plusieurs absences non justifiées" checked={policy.noShowPenalty.enabled} onChange={(v) => patchPolicy({ noShowPenalty: { ...policy.noShowPenalty, enabled: v } })} />
                {policy.noShowPenalty.enabled ? (
                  <>
                    <Stepper label="Nombre d’absences" value={policy.noShowPenalty.threshold} unit="abs." min={1} max={20} onChange={(v) => patchPolicy({ noShowPenalty: { ...policy.noShowPenalty, threshold: v } })} />
                    <Stepper label="Sur une période de" value={policy.noShowPenalty.windowDays} unit="jours" min={1} max={365} step={5} onChange={(v) => patchPolicy({ noShowPenalty: { ...policy.noShowPenalty, windowDays: v } })} />
                    <Stepper label="Blocage pendant" value={policy.noShowPenalty.blockBookingDays} unit="jours" min={1} max={90} onChange={(v) => patchPolicy({ noShowPenalty: { ...policy.noShowPenalty, blockBookingDays: v } })} />
                  </>
                ) : null}
              </Group>
            </>
          ) : section === 'occupancy' ? (
            occQuery.data ? <OccupancySettingsForm form={occDraft ?? formFrom(occQuery.data)} requestIp={occQuery.data.requestIp} onChange={setOccDraft} /> : <Skeleton className="h-64 rounded-xl" />
          ) : section === 'payments' ? (
            <Group title="Moyens de paiement acceptés" icon="payments">
              {PAYMENTS.map((p) => (
                <ToggleRow
                  key={p.key}
                  label={METHOD_LABEL[p.key]}
                  hint={p.sub}
                  checked={cfg.paymentMethods[p.key]}
                  onChange={(v) => {
                    const next = { ...cfg.paymentMethods, [p.key]: v }
                    if (!Object.values(next).some(Boolean)) return toast('Au moins un moyen de paiement doit rester actif.', 'danger')
                    setCfgDraft({ ...cfg, paymentMethods: next })
                  }}
                />
              ))}
              <div className="flex items-center gap-2 bg-surface-2/60 px-5 py-3 text-[13px] text-muted">
                <Icon name={METHOD_ICON.CASH} size={16} /> Ces moyens sont proposés à l’accueil pour chaque vente d’abonnement.
              </div>
            </Group>
          ) : (
            <Group title="Alertes et annonces" icon="campaign">
              <Stepper label="Rappel d’expiration" hint="Prévenir avant la fin de l’abonnement" value={cfg.announcements.expiryReminderDays} unit="j" min={1} max={60} onChange={(v) => setCfgDraft({ ...cfg, announcements: { ...cfg.announcements, expiryReminderDays: v } })} />
              <ChipChoice label="Format des annonces" hint="Affichage sur l’écran d’accueil adhérent" value={cfg.announcements.format} options={[...FORMATS]} onChange={(v) => setCfgDraft({ ...cfg, announcements: { ...cfg.announcements, format: v } })} />
              <ChipChoice label="Format des alertes" hint="Affichage des alertes sur l’accueil adhérent" value={cfg.announcements.alertFormat} options={[...FORMATS]} onChange={(v) => setCfgDraft({ ...cfg, announcements: { ...cfg.announcements, alertFormat: v } })} />
              <ToggleRow label="Notifications push" hint="Annonces et alertes d’expiration" checked={cfg.announcements.push} onChange={(v) => setCfgDraft({ ...cfg, announcements: { ...cfg.announcements, push: v } })} />
            </Group>
          )}
        </div>
      </div>

      {dirty ? (
        <div className="pop-in fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-5 lg:left-64">
          <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-3 py-2.5 shadow-pop">
            <span className="pl-3 text-sm font-semibold">Modifications non enregistrées</span>
            <Button variant="ghost" size="sm" onClick={() => { setCfgDraft(null); setPolicyDraft(null); setOccDraft(null) }}>Annuler</Button>
            <Button size="sm" icon="check" loading={saving} onClick={() => void save()}>Enregistrer</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
