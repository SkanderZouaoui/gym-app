# MuscleUP — Back-office

Interface web de l'équipe de la salle (rôles **ADMIN** et **STAFF** uniquement) : elle reprend, depuis un navigateur, les fonctionnalités de gestion de l'application mobile — mêmes API, mêmes règles, même identité visuelle.

## Lancer

```bash
pnpm --filter @muscleup/backoffice dev     # http://localhost:5173
```

`VITE_API_URL` (fichier `.env`, non versionné) désigne l'API, par exemple `http://localhost:3001`.

## Accès

- Seuls les comptes ayant le rôle `ADMIN` ou `STAFF` peuvent se connecter ; un adhérent ou un coach est refusé et sa session révoquée.
- Un compte cumulant plusieurs rôles passe de l'un à l'autre depuis le menu utilisateur (en bas de la barre latérale).
- Les entrées du menu et les pages dépendent du rôle actif (`src/nav.ts`, `RequireRole`).

## Pages

| Page | Rôle | Équivalent mobile |
|---|---|---|
| Accueil | STAFF, ADMIN | Accueil staff / tableau de bord admin |
| Adhérents (liste, fiche, création, encaissement) | STAFF, ADMIN | Adhérents, profil adhérent, création de compte |
| Caisse | STAFF, ADMIN | Caisse / encaissements |
| Planning (détail du cours, pointage manuel) | STAFF, ADMIN | Planning, détail d'un cours |

## Structure

- `src/components/ui` — kit d'interface (champs, boutons, cartes, tiroirs…) aux couleurs du mobile (`src/index.css`).
- `src/components/domain` — éléments métier (fiche adhérent, vente, cours…).
- `src/api` — client HTTP (rafraîchissement automatique des jetons), types et hooks react-query.
- `src/store/auth.ts` — session, rôles, bascule de rôle.

## Tests

```bash
pnpm --filter @muscleup/backoffice test
```
