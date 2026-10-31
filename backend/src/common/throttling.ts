import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerOptions } from '@nestjs/throttler';

type Req = { ip?: string; body?: { email?: unknown }; originalUrl?: string };

const clientIp = (req: Req) => req.ip ?? 'unknown';
const emailOf = (req: Req) => (typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '');

/** Routes d'authentification sensibles au brute-force (identifiant dans le corps de la requête). */
const AUTH_ROUTE = /\/v1\/auth\/(login|register|forgot-password|reset-password)(\?|$)/;
const notAuthRoute = (ctx: ExecutionContext) => !AUTH_ROUTE.test(ctx.switchToHttp().getRequest<Req>().originalUrl ?? '');

/**
 * Limites de débit. Tous les adhérents d'une salle partagent l'adresse IP publique de son Wi-Fi : une limite « par IP »
 * seule bloquerait toute la salle dès une dizaine de connexions par minute. Les tentatives de connexion sont donc
 * comptées par (IP + e-mail), avec deux plafonds plus larges contre les attaques réparties.
 */
export const throttlerOptions: ThrottlerOptions[] = [
  // Général, par IP : large (réseau partagé).
  { name: 'default', ttl: 60_000, limit: 1500 },
  // Authentification : 10 essais/min pour un même e-mail depuis une même IP — une erreur de frappe n'affecte que son auteur.
  { name: 'auth-account', ttl: 60_000, limit: 10, skipIf: notAuthRoute, getTracker: (req: Req) => `${clientIp(req)}|${emailOf(req)}` },
  // Authentification : 30 essais/min sur un même e-mail, toutes IP confondues (attaque répartie contre un compte).
  { name: 'auth-email', ttl: 60_000, limit: 30, skipIf: notAuthRoute, getTracker: (req: Req) => `email:${emailOf(req)}` },
  // Authentification : 200 essais/min depuis une même IP, tous e-mails confondus (balayage de comptes).
  { name: 'auth-ip', ttl: 60_000, limit: 200, skipIf: notAuthRoute, getTracker: (req: Req) => `ip:${clientIp(req)}` },
];
