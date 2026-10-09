# Conception complète — Application mobile pour salle de sport

> Document de conception **v1.1** — stack : React Native, NestJS, PostgreSQL, MinIO, back-office React.
> Modèle de livraison : un déploiement indépendant par client (pas de multi-tenant), chaque déploiement servant **une seule salle** (pas de multi-sites).

### Changements de la v1.1

- **Le QR code ne sert plus à l'accès à la salle** (pas de matériel de contrôle d'accès). Il sert à **valider la présence à un cours collectif**.
- Le **scanner QR est intégré à l'app mobile** pour les rôles **Coach, Staff et Admin**.
- Ajout du rôle **Staff** (accueil) : **4 rôles** au total (Adhérent, Coach, Staff, Admin).
- **Staff et Admin ont une section dans l'app mobile** (outils de gestion au quotidien). La configuration complète reste dans le back-office web.
- Suppression de l'entité `CheckIn`, de l'anti-passback, du maximum d'entrées par jour et de l'affluence en temps réel (qui dépendaient de scans à l'entrée).
- Ajout d'une politique de présence configurable (fenêtre de scan, inscription sur place, no-show).

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Décisions structurantes et hypothèses](#2-décisions-structurantes-et-hypothèses)
3. [Rôles et permissions](#3-rôles-et-permissions)
4. [Périmètre fonctionnel](#4-périmètre-fonctionnel)
5. [Architecture technique](#5-architecture-technique)
6. [Présence par QR code](#6-présence-par-qr-code)
7. [Modèle de données](#7-modèle-de-données)
8. [Backend NestJS](#8-backend-nestjs)
9. [Application mobile](#9-application-mobile)
10. [Back-office web](#10-back-office-web)
11. [Points techniques délicats](#11-points-techniques-délicats)
12. [Sécurité, RGPD et vie privée](#12-sécurité-rgpd-et-vie-privée)
13. [Déploiement et industrialisation multi-clients](#13-déploiement-et-industrialisation-multi-clients)
14. [Qualité, tests et observabilité](#14-qualité-tests-et-observabilité)
15. [Feuille de route](#15-feuille-de-route)
16. [Risques](#16-risques)
17. [Points ouverts](#17-points-ouverts)

---

## 1. Contexte et objectifs

**Contexte :** application mobile pour une salle de sport précise (premier client), avec l'ambition de la revendre à d'autres salles. Chaque client dispose de son propre déploiement, pour une seule salle.

**Objectifs produit**
- Simplifier la vie des adhérents : réservation de cours, présence validée par QR, suivi de l'entraînement.
- Réduire la charge de l'accueil : abonnements, présences et encaissements gérés depuis un téléphone ou le back-office.
- Fidéliser : points, badges, défis, parrainage, communauté.
- Fournir à la direction des statistiques exploitables (présence aux cours, revenus, rétention).

**Hors périmètre**
- **Paiement en ligne** : les encaissements sont enregistrés manuellement (espèces, virement, chèque). L'entité `Payment` est conservée pour brancher un prestataire plus tard.
- **Contrôle d'accès physique** (portes, tourniquets, badgeuses) : l'application ne pilote aucun matériel. Une intégration pourra être proposée plus tard en option (voir 6.9).
- **Comptage d'affluence en salle** : il nécessiterait des entrées scannées ou des capteurs.

---

## 2. Décisions structurantes et hypothèses

| # | Décision | Choix |
|---|---|---|
| D1 | Modèle de livraison | **Un déploiement par client** : base, MinIO, Redis et backend dédiés. Pas de `tenant_id`. |
| D2 | Périmètre | **Une seule salle par déploiement.** Pas de notion de site ou de branche. |
| D3 | Rôles | **4 rôles** (adhérent, coach, staff, admin), sans portée géographique. |
| D4 | Application mobile | **Une seule app** pour les 4 rôles, navigation et sections selon le rôle. |
| D5 | Back-office web | Configuration et pilotage complets (admin, et staff en consultation limitée si besoin). |
| D6 | Marque blanche | Une app par client, construite depuis le même code (Expo, config dynamique). |
| D7 | Rôle du QR | **Valider la présence à un cours**, scanné par coach, staff ou admin depuis l'app. Pas de contrôle d'accès. |
| D8 | Paiement | Enregistrement manuel uniquement. |
| D9 | Code | **Une seule base de code** pour tous les clients. Pas de fork. Différences par configuration et feature flags. |

**Hypothèses de travail** (à valider, voir section 17)
- H1 : le staff peut enregistrer des encaissements (réglable par l'admin).

---

## 3. Rôles et permissions

Quatre rôles, sans notion de portée géographique puisqu'il n'y a qu'une seule salle.

| Rôle | Usage principal |
|---|---|
| **Adhérent** | Réserver, présenter son QR, suivre son entraînement, communauté, boutique |
| **Coach** | Ses cours et élèves, **scanner les présences de ses cours**, programmes |
| **Staff** (accueil) | **Scanner les présences**, pointage manuel, recherche d'adhérent, inscriptions au nom d'un adhérent, encaissements |
| **Admin** | Pilotage mobile allégé + configuration complète sur le back-office |

> Un utilisateur peut cumuler plusieurs rôles (ex. un admin qui est aussi adhérent) : l'app propose alors un **sélecteur de rôle** dans le profil.

### Matrice des permissions

| Capacité | Adhérent | Coach | Staff | Admin |
|---|:-:|:-:|:-:|:-:|
| Réserver / annuler pour soi | ✔ | — | — | — |
| Afficher son QR | ✔ | — | — | — |
| Scanner un QR de présence | — | ses cours | ✔ | ✔ |
| Pointage manuel | — | ses cours | ✔ | ✔ |
| Inscrire un adhérent à un cours | — | ses cours | ✔ | ✔ |
| Rechercher un adhérent | — | ses élèves | ✔ | ✔ |
| Suspendre un adhérent | — | — | — | ✔ |
| Enregistrer un encaissement | — | — | réglable | ✔ |
| Créer / éditer le planning | — | — | — | ✔ |
| Annuler un cours (avec notification) | — | — | — | ✔ |
| Créer des formules | — | — | — | ✔ |
| Branding, modules | — | — | — | ✔ |
| Envoyer des annonces | — | — | — | ✔ |
| Modération | — | — | signalement | ✔ |
| Statistiques | — | ses élèves | — | ✔ |
| Journal d'audit | — | — | — | ✔ |

Contrôle côté NestJS : `@Roles()` + guard de rôle. Les droits « réglables » sont des paramètres de `OrganizationSettings`.

---

## 4. Périmètre fonctionnel

### 4.1 Adhérent (app mobile)

**Compte et profil**
- Inscription / connexion (email, téléphone, Google/Apple si besoin), réinitialisation de mot de passe
- Profil, photo, objectifs, consentements

**Abonnement**
- Formule, dates, statut (actif, expiré, suspendu), historique, rappel d'expiration

**Cours collectifs**
- Planning filtrable par type de cours, coach
- Réserver, annuler (délai configurable), liste d'attente avec promotion automatique
- **Présenter son QR à l'entrée du cours** (accessible depuis la réservation et l'onglet QR)
- **Confirmation de présence** reçue en temps réel sur le téléphone après le scan
- Historique des présences et absences (no-show)

**Suivi d'entraînement**
- Régularité, séries (streaks), calendrier de présence (alimentés par les présences aux cours et les séances saisies)
- Programmes assignés, journal de séances (exercices, séries, charges, répétitions)
- Bibliothèque d'exercices

**Suivi corporel**
- Poids, mesures, photos de progression (accès privé)

**Coaching**
- Voir les disponibilités d'un coach, réserver une séance individuelle, annuler

**Engagement**
- Points, badges, défis, classements, parrainage

**Communauté**
- Fil d'actualité, commentaires, messagerie, signalement

**Boutique**
- Catalogue, réservation d'un produit, retrait et paiement sur place

**Notifications push**
- Rappel de cours, liste d'attente, expiration, annonces, messages, défis, présence confirmée

**Informations pratiques**
- Horaires, tarifs, contact, règlement intérieur

### 4.2 Coach (app mobile)

- Planning personnel (cours et séances individuelles)
- **Scanner QR des adhérents à l'entrée de ses cours** (cours courant présélectionné)
- Liste des inscrits, pointage manuel en repli, ajout manuel d'un adhérent
- Création et assignation de programmes
- Suivi de la progression de ses élèves (avec consentement)
- Gestion de ses disponibilités et demandes de séances individuelles
- Messagerie avec ses élèves

### 4.3 Staff (app mobile)

- **Aujourd'hui :** cours du jour, avec taux de remplissage et présences en cours
- **Scanner QR** pour n'importe quel cours
- **Recherche d'adhérent** (nom, téléphone) : statut d'abonnement, réservations à venir, historique de présence
- **Pointage manuel** d'un adhérent à un cours
- **Inscrire / désinscrire un adhérent** à un cours au nom de celui-ci (sous réserve des règles)
- **Enregistrer un encaissement** (si autorisé) et renouveler un abonnement
- Signaler un contenu de la communauté
- Consultation des horaires, formules et règlement pour répondre aux questions des adhérents

### 4.4 Admin — section mobile

Pilotage quotidien depuis le téléphone (la configuration complète reste dans le back-office web) :
- **Tableau de bord :** adhérents actifs, présences du jour, taux de remplissage des cours, revenus du jour/mois, alertes
- **Scanner QR** (tous les cours)
- **Adhérents :** recherche, fiche, suspension / réactivation, ajout de notes
- **Planning :** consulter, **annuler un cours** (avec aperçu de la notification aux inscrits), remplacer un coach, modifier la capacité d'une séance
- **Encaissements :** enregistrer un paiement manuel, historique récent
- **Annonces :** envoyer une notification push ciblée (par formule)
- **Modération :** traiter les signalements (masquer, avertir, bloquer)
- **Alertes :** abonnements qui expirent, cours sous-remplis, taux de no-show anormal

### 4.5 Admin — back-office web (complet)

- **Adhérents :** création, édition, suspension, historique, import CSV
- **Abonnements :** formules, attribution, renouvellement, suspension, prolongation
- **Encaissements :** enregistrement manuel, reçus, historique
- **Planning :** modèles de cours récurrents, séances, salles, coachs, capacités, annulation avec notification
- **Présences :** historique des scans et pointages, corrections manuelles, no-show
- **Coaching :** gestion des coachs et de leurs disponibilités
- **Engagement :** badges, défis, règles de points, parrainage
- **Boutique :** produits, stock, réservations
- **Communication :** annonces, notifications ciblées (par formule, segment)
- **Modération :** signalements, contenu masqué, utilisateurs bloqués
- **Statistiques :** présence aux cours, taux de remplissage, no-show, revenus, rétention, churn
- **Configuration :** branding, modules activés, politique de présence, droits du staff
- **Utilisateurs et rôles :** création des comptes coach, staff, admin
- **Audit :** journal des modifications sensibles

---

## 5. Architecture technique

```
┌────────────────────────────────────────┐   ┌─────────────────────────┐
│ React Native (Expo)                    │   │ React (back-office)     │
│ adhérent · coach · staff · admin       │   │ admin / configuration   │
│ (+ scanner QR via caméra)              │   │                         │
└───────────────────┬────────────────────┘   └────────────┬────────────┘
                    │      HTTPS (REST) + WebSocket        │
                    └──────────────────┬───────────────────┘
                                       │
                            ┌──────────▼───────────┐
                            │     NestJS API       │
                            │  (modules métier)    │
                            └──┬────┬────┬────┬────┘
                               │    │    │    │
                      PostgreSQL  MinIO Redis  FCM / APNs
                               (images) (cache, files BullMQ)
```

### 5.1 Stack

| Couche | Technologie | Notes |
|---|---|---|
| Mobile | React Native + Expo (EAS Build) | React Query, Zustand ou Redux Toolkit, `react-native-mmkv`, React Navigation, `expo-camera` (scan QR) |
| Backend | NestJS (TypeScript) | REST + WebSocket (Socket.IO), Swagger |
| Base de données | PostgreSQL | Prisma (recommandé) ou TypeORM |
| Stockage | MinIO (compatible S3) | URL pré-signées |
| Cache / files | Redis + BullMQ | cache de politique, tâches planifiées |
| Notifications | Firebase Cloud Messaging | un projet Firebase par client |
| Back-office | React (Vite) | TanStack Query, composants UI (shadcn/ui ou MUI) |
| Monitoring | Sentry + supervision serveur | étiquette par client |

### 5.2 Organisation du code (monorepo)

```
/apps
  /api            # NestJS
  /mobile         # Expo / React Native (4 rôles)
  /backoffice     # React
/packages
  /api-client     # client TypeScript généré depuis OpenAPI
  /shared         # types, enums, schémas Zod partagés
  /config         # eslint, tsconfig, prettier
/deploy
  /clients/<nom>  # config par client (env, domaine, branding, features)
  /docker         # compose, reverse proxy
```

Outil : pnpm workspaces + Turborepo (ou Nx).

### 5.3 Conventions d'API

- Versionnée : `/v1/...`. Rétrocompatibilité obligatoire.
- Authentification : JWT court (access) + refresh token rotatif, révocable.
- Erreurs : format uniforme `{ code, message, details }`, avec `reasonCode` métier traduit côté client.
- Pagination par curseur pour les listes longues.
- Documentation Swagger, client TypeScript généré et partagé mobile/back-office.

---

## 6. Présence par QR code

### 6.1 Principe

Le QR est la **preuve de présence personnelle** de l'adhérent à un cours. Il est scanné par un **coach, un staff ou un admin** avec la caméra de son téléphone, dans l'app. **Aucun matériel dédié, aucune tablette obligatoire.**

### 6.2 Parcours

1. L'adhérent réserve un cours (statut `CONFIRMED`).
2. À l'entrée du cours, il ouvre son QR (onglet QR ou bouton « Présenter mon QR » dans la réservation).
3. Le coach (ou le staff/admin) ouvre le scanner : le **cours en cours est présélectionné** pour un coach ; staff et admin choisissent le cours dans la liste du jour.
4. Le scan envoie `{ token, sessionId }` au serveur, qui valide et répond.
5. Résultat affiché au scanneur : **vert** (nom, photo, cours, « Présence confirmée ») ou **rouge** (motif).
6. La réservation passe à `ATTENDED`. L'adhérent reçoit en temps réel « Présence confirmée » (WebSocket, push en repli).
7. Événement `booking.attended` : points, badges, séries.

### 6.3 Le token QR

- JWT signé en **asymétrique** (ES256 ou EdDSA), durée de vie **30 à 60 s**, identifiant unique `jti`.
- Claims : identifiant de l'utilisateur, `iat`, `exp`, `jti`. Aucune donnée sensible dans le QR.
- L'app adhérent le récupère via `GET /v1/me/qr-token` et le **renouvelle automatiquement** tant que l'écran est ouvert (compte à rebours visible).
- Le serveur refuse un `jti` déjà utilisé, ce qui rend inutile une capture d'écran partagée.
- La clé publique est exposée (JWKS) pour permettre la vérification hors ligne côté scanneur.

### 6.4 Contrôles effectués au scan

| Contrôle | Code de refus |
|---|---|
| Signature valide | `TOKEN_INVALID` |
| Token non expiré / non réutilisé | `TOKEN_EXPIRED`, `TOKEN_REPLAYED` |
| Scanneur autorisé pour ce cours (rôle + portée) | `SCANNER_NOT_AUTHORIZED` |
| Cours non annulé | `SESSION_CANCELLED` |
| Dans la fenêtre de scan | `OUTSIDE_WINDOW` |
| Réservation existante et confirmée | `NO_BOOKING`, `BOOKING_WAITLISTED`, `BOOKING_CANCELLED` |
| Pas déjà pointé | `ALREADY_CHECKED_IN` |
| Abonnement actif | `MEMBERSHIP_EXPIRED`, `MEMBERSHIP_SUSPENDED` |

Les messages affichés sont traduits côté client à partir du code.

### 6.5 Cas particuliers

- **Pas de réservation (`NO_BOOKING`) :** si la politique l'autorise (`allowWalkIn`) et qu'il reste des places, le scanneur propose **« Inscrire et valider »** (coach, staff, admin), en respectant les règles d'abonnement.
- **Liste d'attente :** une personne en liste d'attente n'est pas validée tant qu'elle n'est pas promue. Le coach peut forcer l'inscription s'il reste des places.
- **Téléphone de l'adhérent en panne ou hors ligne :** le **pointage manuel** depuis la liste des inscrits est le repli. L'app affiche aussi un **code de réservation court** (6 caractères) que le coach peut saisir.
- **Scan erroné :** le coach ou l'admin peut annuler une présence (correction tracée dans le journal d'audit).

### 6.6 Mode hors ligne côté scanneur

- Avant le cours (ou en arrière-plan), l'app du coach/staff **met en cache la liste des inscrits** et la clé publique.
- Le scanneur vérifie la signature et l'expiration localement et marque la présence **en file d'attente**.
- Synchronisation dès le retour du réseau via `POST /v1/attendance/sync` (idempotent sur `sessionId` + `userId`). Le serveur revalide ; les conflits sont signalés au coach.
- L'adhérent doit être en ligne pour obtenir un token frais (sinon : pointage manuel).

### 6.7 No-show

- Un job planifié clôture chaque cours après `noShowGraceMinutes` : les réservations `CONFIRMED` sans présence passent à `NO_SHOW`.
- Notification discrète à l'adhérent.
- **Pénalité optionnelle :** après N no-shows sur une période, blocage temporaire des réservations (configurable, désactivable).

### 6.8 Politique de présence (configurable depuis l'admin)

```json
"attendancePolicy": {
  "scanOpensMinutesBefore": 15,
  "scanClosesMinutesAfterStart": 10,
  "allowWalkIn": false,
  "noShowGraceMinutes": 15,
  "noShowPenalty": {
    "enabled": true,
    "threshold": 3,
    "windowDays": 30,
    "blockBookingDays": 7
  },
  "staffCanRecordPayments": true
}
```

Stockée en JSONB dans `OrganizationSettings`, validée à l'écriture, versionnée et auditée.

### 6.9 Évolution possible : matériel d'accès

Hors périmètre actuel. Si un client le demande, un système de contrôle d'accès tiers pourra appeler un endpoint dédié pour valider un abonnement. L'application n'a pas à changer, et ce pourrait devenir une option payante.

---

## 7. Modèle de données

### 7.1 Organisation

- **OrganizationSettings** — `name`, `branding` (JSON), `features` (JSON), `attendance_policy` (JSONB), `version`, `updated_by`, `updated_at` (une seule ligne)
- **Room** — nom, capacité

### 7.2 Utilisateurs

- **User** — identité, email, téléphone, mot de passe haché, statut, photo, consentements
- **UserRole** — `user_id`, `role` (`MEMBER` / `COACH` / `STAFF` / `ADMIN`)
- **CoachProfile** — `user_id`, bio, spécialités
- **CoachAvailability** — `coach_id`, créneau récurrent ou ponctuel
- **DeviceToken** — `user_id`, token, plateforme

### 7.3 Abonnements et encaissements

- **MembershipPlan** — nom, durée, prix, nombre d'accès, `is_contractual`, `is_active`
- **Membership** — `user_id`, `plan_id`, `start_date`, `end_date`, statut
- **Payment** — `membership_id`, montant, mode (`CASH|TRANSFER|CHECK|OTHER`), `recorded_by`, `recorded_at`, référence, `external_provider_ref` (futur)

### 7.4 Cours, réservations et présence

- **ClassType** — nom, description, niveau, image
- **ClassTemplate** — type, coach, salle, règle de récurrence, capacité
- **ClassSession** — `template_id`, `room_id`, `coach_id`, début/fin, capacité, statut
- **Booking** — `session_id`, `user_id`, statut (`CONFIRMED|WAITLISTED|CANCELLED|ATTENDED|NO_SHOW`), `waitlist_position`, `booking_code` (6 caractères), `attended_at`, `checked_in_by`, `check_in_method` (`QR|MANUAL|WALK_IN`), `created_at`, `cancelled_at`
- **AttendanceScanLog** — `session_id`, `user_id` (nullable), `scanned_by`, `result` (`GRANTED|DENIED`), `reason_code`, `offline` (bool), `scanned_at`
- **QrSigningKey** — identifiant de clé (`kid`), clé publique, clé privée chiffrée, statut, rotation

> L'entité `CheckIn` de la v1.0 est supprimée : la présence est portée par `Booking`.

### 7.5 Coaching et entraînement

- **CoachingSession** — `coach_id`, `member_id`, horaire, statut
- **Exercise** — nom, groupe musculaire, média, instructions
- **Program** — nom, créé par, assigné à, dates
- **ProgramDay** → **ProgramExercise** — jour, exercice, séries, répétitions, repos
- **WorkoutLog** → **WorkoutSet** — date, exercice, charge, répétitions, ressenti
- **BodyMetric** — `user_id`, date, poids, mesures (JSON), `photo_key` (MinIO), visibilité

### 7.6 Fidélité

- **PointsTransaction** — `user_id`, points (+/−), motif, événement source (clé unique)
- **Badge** / **UserBadge**
- **Challenge** / **ChallengeParticipation** — objectif, période, progression
- **Referral** — parrain, filleul, statut, récompense

### 7.7 Social, boutique, notifications

- **Post**, **Comment**, **Reaction**, **Report** (signalements)
- **Conversation**, **ConversationParticipant**, **Message**
- **Product** (stock), **ProductReservation**
- **Notification** (`user_id`, type, contenu, lu), **Announcement** (ciblage par formule)

### 7.8 Audit

- **SettingsAuditLog** — `actor_id`, `entity`, `old_value`, `new_value`, `created_at`
- **AuditLog** général : suspensions, suppressions, encaissements, corrections de présence

### 7.9 Index et contraintes importants

- `Booking` : unicité (`session_id`, `user_id`) pour les réservations actives ; index sur `booking_code`
- `AttendanceScanLog` : index (`session_id`, `scanned_at`)
- `ClassSession` : index sur `starts_at`
- Table des `jti` déjà utilisés (ou clé Redis avec expiration) pour empêcher le rejeu
- Suppressions logiques (`deleted_at`) pour les données comptables et d'audit ; suppression physique pour le droit à l'effacement des données personnelles non comptables

---

## 8. Backend NestJS

### 8.1 Modules

| Module | Responsabilité |
|---|---|
| `auth` | Connexion, JWT, refresh, réinitialisation, guards de rôle |
| `organization` | Settings, branding, features, politique de présence |
| `users` | Profils, rôles (adhérent, coach, staff, admin) |
| `memberships` | Formules, abonnements, statuts |
| `payments` | Enregistrement manuel, reçus (abstraction `PaymentProvider` pour plus tard) |
| `classes` | Types, modèles récurrents, séances |
| `bookings` | Réservation, annulation, liste d'attente, no-show |
| `attendance` | Émission des tokens QR, scan, pointage manuel, synchronisation hors ligne, journal des scans |
| `coaching` | Disponibilités, séances individuelles, programmes, journaux |
| `body-metrics` | Mesures et photos |
| `loyalty` | Points, badges, défis, parrainage (piloté par événements) |
| `social` | Posts, commentaires, messages, modération |
| `shop` | Produits, stock, réservations |
| `notifications` | Push (FCM), in-app, annonces |
| `stats` | Agrégations, exports |
| `files` | URL pré-signées MinIO, validation de type et taille |
| `audit` | Journaux d'audit |

### 8.2 Choix techniques

- **ORM :** Prisma (types, migrations).
- **Validation :** class-validator ou Zod aux frontières.
- **Événements internes :** `@nestjs/event-emitter` (`booking.attended`, `booking.no_show`, `membership.expiring`…), consommés par `loyalty`, `notifications`, `stats`.
- **Tâches planifiées :** BullMQ + `@nestjs/schedule` (rappels de cours, expiration d'abonnements, clôture des cours et no-show, calcul de badges, rotation des clés de signature QR).
- **Temps réel :** Socket.IO (confirmation de présence à l'adhérent, messagerie, mises à jour de planning).
- **Feature flags :** `features` dans `OrganizationSettings` ; un module désactivé n'expose pas ses routes.
- **Internationalisation :** codes de raison côté API, traduction côté clients (français au départ, extensible).

### 8.3 Aperçu des endpoints (indicatif)

```
POST   /v1/auth/login | /refresh | /logout | /forgot-password
GET    /v1/me                          PATCH /v1/me
GET    /v1/classes/sessions?from=&to=
POST   /v1/bookings                    DELETE /v1/bookings/:id

# Présence
GET    /v1/me/qr-token                 # token QR court de l'adhérent
GET    /v1/attendance/jwks             # clés publiques de vérification
GET    /v1/sessions/:id/roster         # inscrits (coach, staff, admin)
POST   /v1/attendance/scan             # { token, sessionId }
POST   /v1/attendance/manual           # pointage manuel (+ annulation)
POST   /v1/attendance/walk-in          # inscrire et valider sur place
POST   /v1/attendance/sync             # envoi groupé des scans hors ligne
GET    /v1/me/attendance               # historique de présence

GET    /v1/me/memberships
GET    /v1/me/workouts                 POST /v1/me/workouts
GET    /v1/coach/sessions              POST /v1/coach/programs

# Staff et admin (mobile et web)
GET    /v1/staff/today
GET    /v1/members?search=             # recherche d'adhérent
POST   /v1/payments                    # encaissement manuel
POST   /v1/admin/sessions/:id/cancel   # avec aperçu de la notification
GET    /v1/admin/dashboard
POST   /v1/admin/announcements

# Administration
POST   /v1/admin/members | /plans | /classes
GET    /v1/admin/stats/overview
GET    /v1/admin/settings/attendance     PUT ...
POST   /v1/admin/settings/simulate
POST   /v1/admin/settings/impact
POST   /v1/files/presign
```

---

## 9. Application mobile

### 9.1 Stack et structure

- Expo (managed workflow, EAS Build), TypeScript strict
- Navigation : React Navigation, **navigateurs distincts par rôle** chargés après la connexion
- Données : React Query (cache, invalidation), client API généré
- État local : Zustand (session, rôle actif), MMKV (persistance rapide)
- Formulaires : React Hook Form + Zod
- Caméra et scan : `expo-camera`
- Notifications : `expo-notifications` + FCM
- Qualité : ESLint, Jest, React Native Testing Library, Maestro ou Detox pour le E2E

### 9.2 Navigation par rôle

| Rôle | Onglets (de gauche à droite) |
|---|---|
| **Adhérent** | Accueil · Planning · **QR** (centre) · Entraînement · Profil |
| **Coach** | Aujourd'hui · Planning · **Scanner** (centre) · Élèves · Profil (Messages dans l'en-tête) |
| **Staff** | Aujourd'hui · Adhérents · **Scanner** (centre) · Planning · Profil |
| **Admin** | Tableau de bord · Planning · **Scanner** (centre) · Adhérents · Plus (encaissements, annonces, modération, alertes) |

Un utilisateur avec plusieurs rôles change de rôle depuis le profil.

### 9.3 Écrans — Adhérent

Accueil (prochain cours, QR rapide, abonnement, défi, annonces) · Planning · Détail d'un cours · Mes réservations · **QR de présence** (QR dynamique, compte à rebours, cours du jour, code de réservation, état « Présence confirmée ») · Entraînement (programmes, séance en cours, historique, bibliothèque) · Progression (mesures, photos, séries, calendrier de présence) · Coaching · Fidélité (points, badges, défis, classement, parrainage) · Communauté · Boutique · Profil et abonnement · Paramètres et consentements · Notifications · Infos pratiques

### 9.4 Écrans — Coach

Aujourd'hui · Planning · **Scanner** (cours courant présélectionné, résultat vert/rouge avec motif, compteur de présents, saisie du code de réservation, bouton « Inscrire et valider » si autorisé, mode hors ligne) · Détail d'un cours (inscrits, pointage manuel, ajout) · Élèves et fiche élève (avec bandeau de consentement) · Création de programme · Disponibilités · Demandes de séances · Messagerie · Profil

### 9.5 Écrans — Staff

- **Aujourd'hui :** cours du jour, remplissage, présences en cours, alertes (cours annulé, coach absent)
- **Scanner :** choix du cours (liste du jour), même écran de résultat que le coach
- **Adhérents :** recherche, fiche (statut d'abonnement, réservations à venir, historique de présence, notes), actions rapides (inscrire à un cours, pointer, enregistrer un paiement, renouveler)
- **Détail d'un cours :** inscrits, pointage manuel, ajout, liste d'attente
- **Encaissement :** montant, mode, formule, confirmation, reçu partageable
- **Planning** (consultation)
- **Infos pratiques** pour répondre aux adhérents
- **Profil :** rôle, déconnexion

### 9.6 Écrans — Admin (section mobile)

- **Tableau de bord :** KPI (adhérents actifs, présences du jour, remplissage, revenus), alertes
- **Planning :** semaine/jour, détail d'une séance, **annulation d'un cours** avec aperçu de la notification, remplacement de coach, modification de capacité
- **Scanner** et détail d'un cours (mêmes écrans que le staff)
- **Adhérents :** recherche, fiche, suspension / réactivation, notes
- **Plus :** encaissements (saisie + historique récent), annonces push ciblées avec aperçu, modération (file de signalements), alertes (abonnements qui expirent, cours sous-remplis, no-show anormal), accès au lien du back-office pour la configuration
- **Profil :** rôle, sélecteur de rôle, déconnexion

> La configuration lourde (formules, branding, modules, statistiques détaillées, audit) reste volontairement dans le back-office web.

### 9.7 Comportements clés

- **Branding dynamique :** couleurs et logo chargés depuis l'API ; nom, icône et identifiants de bundle fixés au build.
- **Scanner :** vibration et son courts selon le résultat, torche, saisie manuelle du code en repli, aucune donnée sensible affichée (nom, photo, cours, statut).
- **Hors ligne :** planning en cache ; pour le scanneur, liste d'inscrits en cache et file de synchronisation.
- **Droits :** les écrans et actions sont masqués selon le rôle et les réglages (ex. encaissement pour le staff). Le serveur reste l'autorité.
- **Mise à jour forcée :** l'API renvoie la version minimale supportée, l'app affiche un écran de blocage si besoin.
- **Accessibilité :** tailles de police dynamiques, contrastes, libellés pour lecteurs d'écran.

---

## 10. Back-office web

- React + Vite, routage par rôle.
- Tableaux paginés avec filtres, recherche, export CSV.
- Pages : Tableau de bord · Adhérents · Abonnements et formules · Encaissements · Planning · **Présences** · Coachs · Utilisateurs et rôles · Engagement · Boutique · Communication · Modération · Statistiques · Paramètres (organisation, branding, modules, politique de présence, droits du staff) · Audit.
- **Présences :** historique des présences et pointages par cours, journal des scans (acceptés/refusés avec motif), corrections manuelles tracées, suivi des no-show et des pénalités.
- Le scan n'est plus une page web : il est dans l'app mobile.
- Statistiques : présence et remplissage des cours, taux de no-show, revenus par mode, nouveaux adhérents, rétention, churn.

---

## 11. Points techniques délicats

**Réservations concurrentes.** Transaction avec verrou (`SELECT ... FOR UPDATE` sur la séance) ou compteur atomique, pour ne jamais dépasser la capacité. À l'annulation, promotion automatique du premier en liste d'attente (même transaction) puis notification.

**QR de présence.** Token asymétrique de 30 à 60 s avec `jti` à usage unique ; le serveur est l'autorité finale. Rotation périodique des clés de signature avec `kid` (les anciennes clés restent valides le temps de l'expiration des tokens).

**Synchronisation hors ligne du scanneur.** Opérations idempotentes (`sessionId` + `userId`), horodatage du scan conservé, revalidation côté serveur. Une présence déjà enregistrée n'est pas dupliquée ; un conflit (réservation annulée entre-temps) est signalé au coach plutôt qu'écrasé.

**Fenêtre et fuseaux horaires.** Stockage en UTC, fuseau de la salle pour l'affichage, la fenêtre de scan et la récurrence (attention aux changements d'heure).

**No-show.** Job idempotent de clôture des cours, sans pénaliser une présence synchronisée tardivement (délai de grâce avant clôture définitive).

**Règles d'abonnement.** Abonnement expiré ou suspendu : ni réservation ni présence validée. Logique centralisée dans `AccessPolicyService`.

**Fidélité par événements.** Points et badges calculés par des écouteurs d'événements, de façon idempotente (clé d'événement unique) pour éviter les doublons.

**Droits du staff et de l'admin.** Toutes les actions sensibles (encaissement, suspension, annulation de cours, correction de présence) sont tracées dans l'audit avec l'auteur.

**Images.** Upload direct vers MinIO par URL pré-signée, compression côté mobile, vignettes générées en tâche de fond, accès privé pour les photos de progression (URL signées de courte durée).

**Messagerie et fil.** Pagination par curseur, WebSocket pour le temps réel, notifications push en repli, signalement et modération obligatoires.

**Migrations.** Prisma Migrate, exécutées automatiquement et de façon rétrocompatible (expand/contract) pour permettre le déploiement progressif.

---

## 12. Sécurité, RGPD et vie privée

- **Authentification :** mots de passe hachés (argon2 ou bcrypt), limitation de débit, verrouillage progressif, refresh tokens rotatifs et révocables.
- **Autorisation :** vérification systématique du rôle côté serveur ; tests dédiés aux accès interdits (ex. un coach qui scanne un cours d'un autre coach).
- **Comptes à privilèges :** staff et admin sont créés par un admin (pas d'auto-inscription), avec option d'authentification renforcée (2FA) pour l'admin.
- **QR :** aucun identifiant sensible dans le code, durée de vie très courte, usage unique.
- **Écran de scan :** n'affiche que le minimum (nom, photo, cours, statut).
- **Données sensibles :** mesures corporelles et photos de progression visibles uniquement par l'adhérent et son coach (avec consentement explicite révocable).
- **Consentements :** CGU, politique de confidentialité, photos, notifications marketing ; horodatés et stockés.
- **Droits RGPD :** export des données et suppression de compte (anonymisation des données comptables conservées légalement).
- **Transport et stockage :** HTTPS partout, chiffrement des sauvegardes, secrets et clés de signature hors du code (gestionnaire de secrets).
- **Journaux d'audit :** actions sensibles du staff et de l'admin, changements de règles, corrections de présence.
- **Modération :** signalement, masquage, blocage d'un utilisateur, conditions d'utilisation de la communauté.
- **Mineurs :** prévoir l'âge minimum et l'accord parental si la salle accepte des mineurs.
- **Conformité locale :** vérifier les obligations applicables (RGPD en Europe, législation locale sur les données personnelles en Tunisie).

---

## 13. Déploiement et industrialisation multi-clients

### 13.1 Un déploiement par client

Chaque client dispose de : backend, PostgreSQL, MinIO, Redis, reverse proxy, domaine, projet Firebase, projet Sentry (ou étiquette).

- **Démarrage :** Docker Compose par client (API + PostgreSQL + MinIO + Redis + reverse proxy avec TLS automatique).
- **Passage à l'échelle :** Kubernetes + Helm si le nombre de clients le justifie.
- **Configuration :** un dossier `deploy/clients/<nom>` avec variables d'environnement, domaine, branding, features ; secrets chiffrés (SOPS ou gestionnaire de secrets), dont les clés de signature QR par client.
- **Sauvegardes automatiques** quotidiennes de PostgreSQL et MinIO, avec test de restauration régulier.
- **CI/CD :** même version du produit déployée sur chaque client, avec possibilité de déployer client par client (canary sur un client pilote).
- **Migrations** exécutées à chaque déploiement, avec retour arrière documenté.

### 13.2 Modules activables

`features` par client : `shop`, `community`, `coaching`, `loyalty`, `referral`, `bodyMetrics`, `staffMobile`, `adminMobile`. Les modules NestJS et les écrans se chargent selon ces indicateurs, ce qui évite de livrer des fonctions non voulues et permet des offres à paliers.

### 13.3 Marque blanche mobile

- `app.config.ts` dynamique : nom, bundle ID / package, icône, splash, couleurs, URL de l'API, injectés par client.
- Un profil de build EAS par client.
- Un projet Firebase (FCM / APNs) par client.
- **Comptes développeur :** publier sous le compte du client (plus propre juridiquement, plus de friction) ou sous le tien (plus simple, responsabilité portée). À décider tôt. Apple exige que chaque app ait une identité propre et une vraie valeur : éviter les coques vides.
- Branding visuel (couleurs, logo) chargeable depuis l'API ; nom, icône et identifiants restent fixés au build.
- **Une seule app pour les 4 rôles** : l'équipe de la salle utilise la même application que les adhérents, avec ses comptes à privilèges. Vérifier que le processus de revue des stores est compatible (fournir des comptes de démonstration pour chaque rôle).

### 13.4 Opérations

- Sentry (API, mobile, back-office) avec étiquette par client.
- Supervision serveur (uptime, CPU, disque, files BullMQ).
- Politique de versions : API `/v1` rétrocompatible, version minimale supportée par l'app, écran de mise à jour forcée.
- Procédure d'**onboarding d'un nouveau client** scriptée : création de l'environnement, génération des clés, import des adhérents, création des comptes coach/staff/admin, branding, build et publication de l'app.

---

## 14. Qualité, tests et observabilité

- **Tests unitaires :** services métier, surtout `AccessPolicyService` (tests en tableau), validation du scan (tous les `reasonCode`), liste d'attente, no-show.
- **Tests d'intégration :** API avec base PostgreSQL de test (Testcontainers), concurrence des réservations, rejeu d'un token QR, synchronisation hors ligne, autorisations par rôle.
- **Tests E2E mobile :** parcours critiques (inscription, réservation, présentation du QR, scan par le coach, encaissement par le staff, annulation d'un cours par l'admin) avec Maestro ou Detox.
- **Tests de charge :** pics de réservation à l'ouverture d'un cours populaire, rafale de scans au début d'un cours.
- **CI :** lint, typage, tests, build, scan de dépendances.
- **Observabilité :** logs structurés avec identifiant de requête, métriques (latence, erreurs, taux de refus de scan par motif), alertes.
- **Environnements :** développement, recette, production par client.

---

## 15. Feuille de route

Construire par couches, avec des versions testables en salle.

### Phase 1 — Socle
- Monorepo, CI, conventions
- Auth, **4 rôles**, `OrganizationSettings` (config, features, branding)
- Utilisateurs, formules, abonnements, encaissements manuels
- Back-office de base (adhérents, abonnements, paiements, utilisateurs et rôles)
- Premier script de déploiement reproductible (Docker Compose)

### Phase 2 — Cœur de l'usage
- Planning, séances, réservations, liste d'attente
- **QR de présence et scanner** (coach, staff, admin), pointage manuel, journal des scans, no-show
- `AccessPolicyService` et politique de présence configurable
- Notifications push (rappels, expirations, présence confirmée)

> Les phases 1 et 2 forment déjà un produit utilisable en salle (premier pilote).

### Phase 3 — Outils staff et admin sur mobile
- Section Staff : aujourd'hui, recherche d'adhérent, inscriptions au nom d'un adhérent, encaissement
- Section Admin : tableau de bord, annulation de cours, suspension, annonces, modération, alertes

### Phase 4 — Coaching
- Disponibilités et séances individuelles
- Programmes, bibliothèque d'exercices, journal de séances
- Suivi corporel et photos (consentements, accès restreint)

### Phase 5 — Engagement
- Points, badges, défis, parrainage
- Séries et calendrier de présence

### Phase 6 — Social et boutique
- Fil d'actualité, commentaires, messagerie, classements, modération
- Catalogue et réservation de produits
*(la communauté est la fonction la plus coûteuse pour la valeur apportée, donc en dernier)*

### Phase 7 — Finition et mise en production
- Statistiques admin complètes, exports
- Mode hors ligne, performances, accessibilité
- Tests E2E et de charge, audit de sécurité
- Publication sur les stores, documentation d'exploitation
- Procédure d'onboarding client

### Évolutions futures
- Paiement en ligne (Stripe ou prestataire local) via l'abstraction `PaymentProvider`
- Intégration optionnelle de matériel d'accès et affluence en temps réel
- Intégration wearables (Apple Health, Google Fit)
- Multi-langue, tableau de bord de supervision multi-clients

---

## 16. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Périmètre très large | Retard, qualité | Livrer par phases, pilote dès la phase 2 |
| Dérive entre clients (forks) | Maintenance impossible | Une seule base de code, configuration et feature flags |
| Coach ou staff qui oublient de scanner | Présences et no-show faussés | Pointage manuel en repli, délai de grâce, no-show non punitif par défaut, rappel au coach en fin de cours |
| Adhérent sans téléphone chargé ou sans réseau | Friction à l'entrée du cours | Code de réservation court, pointage manuel |
| Comptes à privilèges compromis (staff, admin) | Fuite de données, fraude à l'encaissement | 2FA admin, droits minimaux, audit, révocation rapide |
| Encaissements manuels mal tracés | Écarts de caisse | Journal d'audit, historique, export, rapprochement par l'admin |
| Refus Apple de l'app en marque blanche | Blocage de publication | Identité propre par app, fonctionnalités réelles, comptes de démonstration par rôle |
| Données sensibles (photos, mesures) | Risque juridique et réputationnel | Consentement, accès restreint, chiffrement, suppression |
| Modération de la communauté | Contenu problématique | Signalement, outils de modération, CGU |
| Pic de scans au début d'un cours | Lenteur | Validation légère, cache de la liste d'inscrits, mode hors ligne |
| Pic de réservations | Surbooking, lenteur | Verrous transactionnels, tests de charge |
| Opérations multi-déploiements | Charge de maintenance | Automatisation, monitoring centralisé, canary |

---

## 17. Points ouverts

1. **Fenêtre de scan :** valeurs par défaut (15 min avant, 10 min après le début) à valider avec la salle.
2. **Inscription sur place (`allowWalkIn`) :** autorisée ou non pour le premier client ?
3. **No-show :** pénalité activée ou simple suivi statistique au lancement ?
4. **Staff et encaissements :** le staff peut-il enregistrer des paiements ? Peut-il suspendre un adhérent ?
5. **Périmètre exact de l'admin mobile :** la liste de la section 4.4 convient-elle, ou faut-il retirer/ajouter des actions ?
6. **Compte développeur stores :** au nom du client ou au tien ?
7. **Mineurs :** la salle accepte-t-elle des adhérents mineurs ?
8. **Pays et réglementation :** Tunisie, France ou les deux ? Impact sur RGPD, TVA/reçus et prestataire de paiement futur.
9. **Messagerie entre adhérents :** autorisée ou limitée aux échanges adhérent ↔ coach ?
10. **Langues :** français uniquement ou aussi arabe / anglais (impact sur le RTL) ?
11. **Hébergement :** serveur propre, cloud (quel fournisseur), ou chez le client ?
