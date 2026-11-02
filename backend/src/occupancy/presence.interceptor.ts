import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { Role } from '@muscleup/shared';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { clientIp } from './client-ip.js';
import { PresenceTrackerService } from './presence-tracker.service.js';

/**
 * Intercepteur global : chaque requête HTTP authentifiée d'un adhérent (rôle actif MEMBER) met à jour
 * son signal de présence. Les comptes de l'équipe (accueil, coach, admin) ne sont pas comptés : ils
 * travaillent sur place mais ne sont pas des pratiquants. Le suivi est lancé sans être attendu.
 */
@Injectable()
export class PresenceInterceptor implements NestInterceptor {
  constructor(private readonly tracker: PresenceTrackerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      try {
        const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
        const user = req.user;
        if (user?.userId && user.activeRole === Role.MEMBER) this.tracker.track(user.userId, clientIp(req));
      } catch {
        // Best-effort : ne jamais faire échouer la requête.
      }
    }
    return next.handle();
  }
}
