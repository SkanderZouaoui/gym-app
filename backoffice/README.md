# MuscleUP — Back-office

Interface web de l'équipe de la salle (rôles **ADMIN** et **STAFF** uniquement) : elle reprend, depuis un navigateur, les fonctionnalités de gestion de l'application mobile — mêmes API, mêmes règles, même identité visuelle.

## Lancer

```bash
pnpm --filter @muscleup/backoffice dev     # http://localhost:5173
```

`VITE_API_URL` (fichier `.env`, non versionné) désigne l'API, par exemple `http://localhost:3001`.

## Photos : CORS du stockage

L'envoi et la retouche des photos se font directement entre le navigateur et le stockage (URLs présignées) : le bucket doit autoriser l'origine du back-office. Après `pnpm --filter backend build` :

```bash
CORS_ORIGINS=http://localhost:5173 node backend/dist/scripts/set-bucket-cors.js
```

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
| Planning : créer, modifier, annuler, supprimer un cours | ADMIN | Formulaire cours, planning admin |
| Abonnements (forfaits, remises) | ADMIN | Abonnements |
| Cours et salles (types, salles, galeries photos) | ADMIN | Cours et salles |
| Équipe (comptes, planning de travail, activité) | ADMIN | Équipe |
| Réglages (salle et horaires, réservation et présence, paiements, annonces) | ADMIN | Configuration |
| Communication (annonces, alertes adhérents, notifications push et règles) | ADMIN | Annonces, Alertes, Notifications |
| Programmes (validation des programmes des coachs, création par l'admin, exercices) | ADMIN | Programmes, Exercices, nouveau programme |
| Statistiques (période, fréquentation, encaissements, rétention, export CSV) et journal de pointage | ADMIN | Tableau de bord admin |
| Notifications personnelles | STAFF, ADMIN | Notifications |
| Mon profil (informations, photo, mot de passe) | STAFF, ADMIN | Profil |
| Accueil admin : présences de la semaine et éléments à configurer | ADMIN | Tableau de bord admin |

## Structure

- `src/components/ui` — kit d'interface (champs, boutons, cartes, tiroirs…) aux couleurs du mobile (`src/index.css`).
- `src/components/domain` — éléments métier (fiche adhérent, vente, cours…).
- `src/api` — client HTTP (rafraîchissement automatique des jetons), types et hooks react-query.
- `src/store/auth.ts` — session, rôles, bascule de rôle.

## Tests

```bash
pnpm --filter @muscleup/backoffice test
```
