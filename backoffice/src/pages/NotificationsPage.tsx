import { useDeleteNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useMyNotifications } from '../api/me'
import { formatDateTime } from '../lib/format'
import { Button, Card, EmptyState, ErrorState, Icon, IconButton, PageHeader, Skeleton, cn } from '../components/ui'

const ICON: Record<string, string> = { ADMIN_PAYMENT: 'payments', ADMIN_NEW_MEMBER: 'person_add' }

/** Mes notifications : alertes reçues par la personne connectée (encaissements, nouveaux adhérents…). */
export function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useMyNotifications()
  const read = useMarkNotificationRead()
  const readAll = useMarkAllNotificationsRead()
  const remove = useDeleteNotification()
  const list = data ?? []
  const unread = list.filter((n) => !n.readAt).length

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle={unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu.'} actions={unread > 0 ? <Button variant="outline" icon="done_all" loading={readAll.isPending} onClick={() => readAll.mutate()}>Tout marquer comme lu</Button> : undefined} />
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : list.length === 0 ? (
          <EmptyState icon="notifications_off" title="Aucune notification" hint="Les encaissements et nouveaux adhérents apparaissent ici." />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((n) => (
              <li key={n.id} className={cn('flex items-start gap-4 px-5 py-4', !n.readAt && 'bg-primary-soft/40')}>
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', n.readAt ? 'bg-surface-2 text-muted' : 'bg-primary-soft text-primary-ink')}><Icon name={ICON[n.type] ?? 'notifications'} size={22} /></span>
                <button className="min-w-0 flex-1 text-left" onClick={() => !n.readAt && read.mutate(n.id)}>
                  <div className="flex items-center gap-2"><span className="font-bold">{n.title}</span>{!n.readAt ? <span className="size-2 rounded-full bg-primary" /> : null}</div>
                  <div className="text-sm text-muted">{n.body}</div>
                  <div className="mt-0.5 text-xs text-muted">{formatDateTime(n.createdAt)}</div>
                </button>
                <IconButton icon="delete" label="Supprimer la notification" onClick={() => remove.mutate(n.id)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
