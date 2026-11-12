export type AppRole = 'MEMBER' | 'COACH' | 'STAFF' | 'ADMIN';

const GROUP: Record<AppRole, string> = { MEMBER: '(member)', COACH: '(coach)', STAFF: '(staff)', ADMIN: '(admin)' };

export type NotificationTarget =
  | { kind: 'route'; href: string }
  /** Reste sur l'écran Notifications, onglet Annonces. */
  | { kind: 'announcements' };

/** Page ou section dédiée à une notification, selon son type et ses données ; null si rien à ouvrir. */
export function notificationTarget(type: string, data: Record<string, unknown> | null | undefined, role: AppRole): NotificationTarget | null {
  const g = GROUP[role];
  const d = data ?? {};
  const str = (k: string) => (typeof d[k] === 'string' && d[k] ? (d[k] as string) : null);
  switch (type) {
    case 'CLASS_REMINDER':
    case 'WAITLIST_PROMOTED':
    case 'ATTENDANCE_CONFIRMED': {
      const sessionId = str('sessionId');
      return { kind: 'route', href: sessionId ? `/${g}/session/${sessionId}` : `/${g}/(tabs)/planning` };
    }
    case 'MEMBERSHIP_EXPIRING':
      return { kind: 'route', href: '/(member)/subscription' };
    case 'PERSONAL_RECORD': {
      const workoutLogId = str('workoutLogId');
      const memberId = str('memberId');
      // Adhérent : la séance où le record a été battu (ses séries marquées d'un trophée).
      if (workoutLogId && role === 'MEMBER') return { kind: 'route', href: `/(member)/workout/${workoutLogId}` };
      // Coach : fiche de l'adhérent qui a battu son record.
      if (memberId && role === 'COACH') return { kind: 'route', href: `/(coach)/member/${memberId}` };
      // Anciennes notifications, sans identifiant de séance.
      return { kind: 'route', href: '/(member)/history' };
    }
    case 'ANNOUNCEMENT':
      return { kind: 'announcements' };
    case 'ADMIN_PAYMENT':
      return { kind: 'route', href: '/(admin)/cash' };
    case 'ADMIN_NEW_MEMBER':
      return { kind: 'route', href: '/(admin)/(tabs)/members' };
    default:
      return null;
  }
}
