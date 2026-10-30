import type { PrismaService } from '../prisma/prisma.service.js';

type AdminEvent =
  | { kind: 'payment'; amount: number; method: string; memberName: string; actorName: string }
  | { kind: 'new_member'; memberName: string; actorName: string };

/**
 * Notifie les admins actifs d'un événement utile (nouvel encaissement, nouveau compte adhérent).
 * L'auteur de l'action n'est pas notifié de ses propres actions. Ne bloque jamais l'action d'origine.
 * `data.kind` + paramètres permettent au client de traduire le message.
 */
export async function notifyAdmins(prisma: PrismaService, actorId: string, event: AdminEvent): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { status: 'ACTIVE', deletedAt: null, roles: { some: { role: 'ADMIN' } }, NOT: { id: actorId } },
      select: { id: true },
    });
    if (admins.length === 0) return;
    const payment = event.kind === 'payment';
    const title = payment ? 'Nouvel encaissement' : 'Nouveau compte adhérent';
    const body = payment
      ? `${event.amount} DT (${event.method}) · ${event.memberName} · par ${event.actorName}`
      : `${event.memberName} · créé par ${event.actorName}`;
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: payment ? ('ADMIN_PAYMENT' as const) : ('ADMIN_NEW_MEMBER' as const),
        title,
        body,
        data: event,
      })),
    });
  } catch {
    // une notification manquée ne doit pas faire échouer l'encaissement ou la création de compte
  }
}
