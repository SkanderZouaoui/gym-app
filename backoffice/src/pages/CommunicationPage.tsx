import { useSearchParams } from 'react-router-dom'
import { PageHeader, Tabs } from '../components/ui'
import { AlertsTab } from './communication/AlertsTab'
import { AnnouncementsTab } from './communication/AnnouncementsTab'
import { NotificationsTab } from './communication/NotificationsTab'

type Tab = 'announcements' | 'alerts' | 'notifications'

/** Communication vers les adhérents : annonces, alertes d'accueil et notifications push. */
export function CommunicationPage() {
  const [params, setParams] = useSearchParams()
  const tab = (['announcements', 'alerts', 'notifications'].includes(params.get('tab') ?? '') ? params.get('tab') : 'announcements') as Tab
  return (
    <div className="space-y-6">
      <PageHeader title="Communication" subtitle="Annonces, alertes et notifications envoyées à vos adhérents." />
      <Tabs value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} options={[{ value: 'announcements', label: 'Annonces' }, { value: 'alerts', label: 'Alertes adhérents' }, { value: 'notifications', label: 'Notifications push' }]} />
      {tab === 'announcements' ? <AnnouncementsTab /> : tab === 'alerts' ? <AlertsTab /> : <NotificationsTab />}
    </div>
  )
}
