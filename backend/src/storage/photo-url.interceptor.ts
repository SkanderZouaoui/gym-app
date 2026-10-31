import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, mergeMap } from 'rxjs';
import { StorageService } from './storage.service.js';

const MAX_DEPTH = 8;

/**
 * Photos de profil dans toutes les réponses : tout objet qui contient une `photoKey` reçoit une `photoUrl`
 * (URL de lecture signée à durée limitée, ou null). Il suffit donc de sélectionner `photoKey` dans une requête
 * pour que les écrans puissent afficher la photo à la place des initiales. Une clé n'est signée qu'une fois par réponse.
 */
@Injectable()
export class PhotoUrlInterceptor implements NestInterceptor {
  constructor(private readonly storage: StorageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    return next.handle().pipe(
      mergeMap(async (data) => {
        const targets: Record<string, unknown>[] = [];
        collect(data, targets, 0);
        if (targets.length === 0) return data;

        const urls = new Map<string, Promise<string>>();
        await Promise.all(
          targets.map(async (obj) => {
            const key = obj.photoKey;
            if (typeof key !== 'string') {
              obj.photoUrl = null;
              return;
            }
            if (!urls.has(key)) urls.set(key, this.storage.getReadUrl(key));
            obj.photoUrl = await urls.get(key);
          }),
        );
        return data;
      }),
    );
  }
}

/** Parcourt tableaux et objets simples (pas les Date, Decimal… qui sont des instances de classe). */
function collect(node: unknown, out: Record<string, unknown>[], depth: number): void {
  if (depth > MAX_DEPTH || node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collect(item, out, depth + 1);
    return;
  }
  const proto = Object.getPrototypeOf(node);
  if (proto !== Object.prototype && proto !== null) return;

  const obj = node as Record<string, unknown>;
  if ('photoKey' in obj && obj.photoUrl === undefined) out.push(obj);
  for (const value of Object.values(obj)) collect(value, out, depth + 1);
}
