# Muscle UP

Application de gestion et de suivi pour **une salle de sport** : réservation de cours, présence par QR code, abonnements et encaissements, programmes d'entraînement, annonces et notifications. Livrée sous forme d'**un déploiement par salle** (base, stockage et backend dédiés), avec une **application mobile** pour les 4 rôles (adhérent, coach, accueil, admin) et un **back-office web**.

> La conception détaillée (modèle de données, sécurité, déploiement, feuille de route) est dans [conception-application-salle-de-sport.md](conception-application-salle-de-sport.md).

## Sommaire

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Démarrage](#démarrage)
- [Structure du dépôt](#structure-du-dépôt)
- [Tests et qualité](#tests-et-qualité)
- [Déploiement](#déploiement)

## Aperçu

> **À propos des captures d'écran.** Elles sont générées à partir des **maquettes du design system** (`Design System/*.dc.html`), pas depuis un téléphone. Elles montrent le rendu visé pour chaque écran ; l'application suit ces maquettes mais certains détails (textes, données) peuvent différer.

### Lancement : splash, connexion, onboarding
<table>
<tr><td align="center" width="160"><img src="docs/screenshots/splash-1.png" width="150" alt="Splash animé"><br><sub>Splash animé</sub></td><td align="center" width="160"><img src="docs/screenshots/login-1.png" width="150" alt="Connexion"><br><sub>Connexion</sub></td><td align="center" width="160"><img src="docs/screenshots/login-2.png" width="150" alt="Première connexion"><br><sub>Première connexion</sub></td><td align="center" width="160"><img src="docs/screenshots/login-3.png" width="150" alt="Mot de passe oublié"><br><sub>Mot de passe oublié</sub></td><td align="center" width="160"><img src="docs/screenshots/onboarding-1.png" width="150" alt="Onboarding 1 · Réserver"><br><sub>Onboarding 1 · Réserver</sub></td></tr>
<tr><td align="center" width="160"><img src="docs/screenshots/onboarding-2.png" width="150" alt="Onboarding 2 · Entrer"><br><sub>Onboarding 2 · Entrer</sub></td><td align="center" width="160"><img src="docs/screenshots/onboarding-3.png" width="150" alt="Onboarding 3 · Objectif"><br><sub>Onboarding 3 · Objectif</sub></td><td align="center" width="160"><img src="docs/screenshots/onboarding-4.png" width="150" alt="Onboarding 4 · Profil"><br><sub>Onboarding 4 · Profil</sub></td></tr>
</table>

### Adhérent
<table>
<tr><td align="center" width="160"><img src="docs/screenshots/adherent-accueil.png" width="150" alt="Accueil"><br><sub>Accueil</sub></td><td align="center" width="160"><img src="docs/screenshots/adherent-planning.png" width="150" alt="Planning"><br><sub>Planning</sub></td><td align="center" width="160"><img src="docs/screenshots/adherent-mes-reservations.png" width="150" alt="Mes réservations"><br><sub>Mes réservations</sub></td><td align="center" width="160"><img src="docs/screenshots/adherent-qr-presence.png" width="150" alt="QR de présence"><br><sub>QR de présence</sub></td><td align="center" width="160"><img src="docs/screenshots/adherent-entrainement.png" width="150" alt="Entraînement"><br><sub>Entraînement</sub></td></tr>
<tr><td align="center" width="160"><img src="docs/screenshots/adherent-seance-en-cours.png" width="150" alt="Séance en cours"><br><sub>Séance en cours</sub></td><td align="center" width="160"><img src="docs/screenshots/adherent-historique-seances.png" width="150" alt="Historique"><br><sub>Historique</sub></td><td align="center" width="160"><img src="docs/screenshots/adherent-detail-programme.png" width="150" alt="Détail programme"><br><sub>Détail programme</sub></td><td align="center" width="160"><img src="docs/screenshots/adherent-progres.png" width="150" alt="Progrès"><br><sub>Progrès</sub></td><td align="center" width="160"><img src="docs/screenshots/adherent-profil.png" width="150" alt="Profil"><br><sub>Profil</sub></td></tr>
</table>

### Coach
<table>
<tr><td align="center" width="160"><img src="docs/screenshots/coach-accueil.png" width="150" alt="Accueil"><br><sub>Accueil</sub></td><td align="center" width="160"><img src="docs/screenshots/coach-planning.png" width="150" alt="Planning"><br><sub>Planning</sub></td><td align="center" width="160"><img src="docs/screenshots/coach-detail-du-cours.png" width="150" alt="Détail du cours"><br><sub>Détail du cours</sub></td><td align="center" width="160"><img src="docs/screenshots/coach-scan-presence.png" width="150" alt="Scan de présence"><br><sub>Scan de présence</sub></td><td align="center" width="160"><img src="docs/screenshots/coach-programmes.png" width="150" alt="Programmes"><br><sub>Programmes</sub></td></tr>
<tr><td align="center" width="160"><img src="docs/screenshots/coach-nouveau-programme.png" width="150" alt="Nouveau programme"><br><sub>Nouveau programme</sub></td><td align="center" width="160"><img src="docs/screenshots/coach-detail-programme.png" width="150" alt="Détail programme"><br><sub>Détail programme</sub></td><td align="center" width="160"><img src="docs/screenshots/coach-profil.png" width="150" alt="Profil"><br><sub>Profil</sub></td></tr>
</table>

### Accueil (staff)
<table>
<tr><td align="center" width="160"><img src="docs/screenshots/accueil-accueil.png" width="150" alt="Accueil"><br><sub>Accueil</sub></td><td align="center" width="160"><img src="docs/screenshots/accueil-adherents.png" width="150" alt="Adhérents"><br><sub>Adhérents</sub></td><td align="center" width="160"><img src="docs/screenshots/accueil-fiche-adherent.png" width="150" alt="Fiche adhérent"><br><sub>Fiche adhérent</sub></td><td align="center" width="160"><img src="docs/screenshots/accueil-creation-de-compte.png" width="150" alt="Création de compte"><br><sub>Création de compte</sub></td><td align="center" width="160"><img src="docs/screenshots/accueil-planning.png" width="150" alt="Planning"><br><sub>Planning</sub></td></tr>
<tr><td align="center" width="160"><img src="docs/screenshots/accueil-scan-qr.png" width="150" alt="Scan QR"><br><sub>Scan QR</sub></td><td align="center" width="160"><img src="docs/screenshots/accueil-encaissements.png" width="150" alt="Encaissements"><br><sub>Encaissements</sub></td><td align="center" width="160"><img src="docs/screenshots/accueil-encaissement.png" width="150" alt="Nouvel encaissement"><br><sub>Nouvel encaissement</sub></td><td align="center" width="160"><img src="docs/screenshots/accueil-recu.png" width="150" alt="Reçu"><br><sub>Reçu</sub></td><td align="center" width="160"><img src="docs/screenshots/accueil-profil.png" width="150" alt="Profil"><br><sub>Profil</sub></td></tr>
</table>

### Admin
<table>
<tr><td align="center" width="160"><img src="docs/screenshots/admin-pilotage.png" width="150" alt="Pilotage"><br><sub>Pilotage</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-planning.png" width="150" alt="Planning"><br><sub>Planning</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-edition-cours.png" width="150" alt="Édition d’un cours"><br><sub>Édition d’un cours</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-adherents.png" width="150" alt="Adhérents"><br><sub>Adhérents</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-abonnements.png" width="150" alt="Abonnements"><br><sub>Abonnements</sub></td></tr>
<tr><td align="center" width="160"><img src="docs/screenshots/admin-encaissements.png" width="150" alt="Encaissements"><br><sub>Encaissements</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-programmes.png" width="150" alt="Programmes"><br><sub>Programmes</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-alertes-adherents.png" width="150" alt="Alertes"><br><sub>Alertes</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-annonces.png" width="150" alt="Annonces"><br><sub>Annonces</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-notifications.png" width="150" alt="Notifications"><br><sub>Notifications</sub></td></tr>
<tr><td align="center" width="160"><img src="docs/screenshots/admin-equipe.png" width="150" alt="Équipe"><br><sub>Équipe</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-configuration.png" width="150" alt="Configuration"><br><sub>Configuration</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-plus.png" width="150" alt="Plus"><br><sub>Plus</sub></td><td align="center" width="160"><img src="docs/screenshots/admin-profil.png" width="150" alt="Profil"><br><sub>Profil</sub></td></tr>
</table>


## Fonctionnalités

### Communes à tous les rôles
- **Connexion** par e-mail / mot de passe. Pas d'auto-inscription : les comptes sont créés par l'accueil ou l'admin.
- **Première connexion** : le mot de passe provisoire (généré automatiquement) doit être remplacé, avec jauge de robustesse et règles (8 caractères, majuscule, chiffre, symbole).
- **Mot de passe oublié** : code à usage unique reçu par e-mail, puis nouveau mot de passe.
- **Splash animé** « Le mouvement » : un point suit la trajectoire du muscle-up, passe au-dessus de la barre, puis le nom se révèle.
- **Trois langues** : français, anglais et arabe (avec mise en page de droite à gauche), sélecteur de langue sur la connexion, le profil et la configuration. Tous les textes sont dans `mobile/src/i18n/locales/`.
- **Thèmes clair et sombre** suivant le réglage du téléphone.
- **Notifications** : écran à trois onglets (notifications, annonces, alertes — y compris les passées), regroupées par date, marquage « lu » au clic, **suppression par balayage** (bouton ou second balayage).
- **Alertes et annonces de l'admin** affichées sur l'accueil en bandeau, encart ou pop-up (choisi dans la configuration) et ciblables par public ; une alerte fermée avec la croix ne revient plus sur l'accueil.
- **Chargement en squelettes**, **tirer pour actualiser** partout, **mode hors-ligne** pour le QR et les données mises en cache.

### Adhérent
- **Onboarding** en 4 écrans (réserver, entrer, objectif, profil physique) affiché à la première connexion et tant que le profil n'est pas rempli ; navigation par balayage, saisie clavier de la taille, du poids et de l'âge.
- **Accueil** : prochain cours, réservations, alertes et annonces.
- **Planning** et **réservation de cours** avec confirmation, liste d'attente, règles d'annulation (pas de réservation d'un cours commencé, pas d'annulation d'un cours terminé), confirmation d'annulation.
- **QR de présence** renouvelé régulièrement, utilisable hors-ligne ; **code adhérent à 6 chiffres** pour le pointage manuel.
- **Entraînement** : bibliothèque d'exercices par groupe musculaire, programmes (proposés ou assignés par un coach), séance en cours, historique, mesures corporelles et progrès.
- **Objectif hebdomadaire** : nombre de séances par semaine choisi à l'onboarding, carte d'activité sur le profil, écran de suivi des séances par semaine (paginé) et modification de l'objectif.
- **Abonnement**, profil, sécurité, suppression du compte.

### Coach
- **Accueil** : prochain cours avec présence en temps réel et bouton de scan, chiffres du jour, « à traiter » (pointages, programmes en validation ou refusés) et cours du jour.
- **Planning** (14 jours, filtres) et **détail d'un cours** : infos, présence, inscrits avec leur formule et leur code, pointage manuel, liste d'attente.
- **Scan QR de présence** des adhérents.
- **Programmes** : création et assignation à un élève ; les programmes sont **soumis à validation par l'admin** (validé, en attente, refusé avec motif).
- **Élèves suivis** et leurs séances.

### Accueil (staff)
- **Accueil** : chiffres du jour, encaissements, cours du jour, alertes.
- **Adhérents** : recherche, fiche, **création de compte** (formule et premier encaissement obligatoires, mot de passe provisoire généré), réinitialisation du mot de passe.
- **Planning** de la salle avec filtres, **scan QR** et pointage manuel.
- **Caisse** : encaissements (espèces, virement, chèque…), reçus, historique paginé.

### Admin
- **Pilotage** : indicateurs (adhérents actifs, cours du jour, encaissements…), raccourcis personnalisables, cours du moment, abonnements à relancer, derniers encaissements, équipe en poste, alertes de configuration manquante.
- **Planning** : création et édition des cours (date et heure, types de cours et salles à choisir ou créer à la volée).
- **Adhérents et abonnements** : formules, remises, **revenu mensuel récurrent**, relances.
- **Encaissements** par période (ce mois, mois dernier, plage libre) avec pagination.
- **Programmes et exercices** : bibliothèque par groupe musculaire, validation des programmes proposés par les coachs.
- **Communication** : annonces (modifiables et supprimables, ciblées adhérents / équipe / accueil / coachs), alertes avec filtres, **notifications programmées**, et une **boîte de réception** (nouveaux encaissements, nouveaux comptes).
- **Équipe** : comptes coach / accueil / admin, détails, statistiques d'activité, planning de travail, réinitialisation de mot de passe, suppression avec confirmation.
- **Configuration** par pages dédiées : coordonnées, horaires, moyens de paiement, règles de réservation et d'annulation, fenêtre de scan, remises, formats d'affichage des annonces et alertes.

### Back-office web
Application React (Vite) pour la configuration complète : tableau de bord, adhérents, formules, planning et cours, coachs et équipe, rôles, règles, textes et marque, navigation, notifications, statistiques, publication de la configuration.

## Architecture

| Couche | Technologies |
|---|---|
| Application mobile | Expo SDK 58, React Native 0.88, expo-router (typed routes), react-native-reanimated, TanStack Query (cache persisté), Zustand, react-i18next |
| Backend | NestJS, Prisma 6, PostgreSQL, JWT (access + refresh), argon2, tâches planifiées (`@Cron`) |
| Stockage et cache | S3 compatible (Garage / MinIO) pour les photos, Redis |
| Back-office | React, Vite, TypeScript |
| Monorepo | pnpm workspaces + Turborepo ; package partagé `@muscleup/shared` (rôles, types) |

Points notables : QR de présence signés et à courte durée de vie ; politique de présence configurable (fenêtre de scan, inscription sur place, no-show) ; règles de paiement, de liste d'attente et d'annulation appliquées **côté serveur** ; journal d'audit des actions sensibles.

## Démarrage

### Prérequis
Node.js ≥ 20, pnpm, Docker (PostgreSQL, Redis, stockage objet).

### Installation
```bash
pnpm install
pnpm infra:up                      # PostgreSQL, Redis, stockage S3
cp backend/.env.example backend/.env   # puis renseigner les secrets
cd backend && npx prisma migrate deploy && pnpm db:seed && cd ..
```

### Lancer les applications
```bash
PORT=3001 pnpm dev:backend         # API NestJS (port 3001 pour l'app mobile)
pnpm dev:mobile                    # Expo (scanner le QR avec Expo Go)
pnpm dev:backoffice                # back-office web
```

### Configuration de l'app mobile
Créer `mobile/.env` avec l'adresse de l'API **joignable depuis le téléphone** (IP locale du poste de développement, pas `localhost`) :
```
EXPO_PUBLIC_API_URL=http://<ip-du-poste>:3001
```
Si le Wi-Fi change, mettre à jour l'adresse puis relancer Expo avec `--clear`. Le téléphone et le poste doivent être sur le même réseau.

### Données de démonstration
Les scripts `backend/prisma/seed*.ts` créent des comptes, des cours, des programmes et des encaissements de démonstration (par exemple un coach `ramzi@muscleup.com`). Des mots de passe de démonstration sont définis dans ces scripts : **ne jamais les utiliser en production**.

## Structure du dépôt

```
backend/        API NestJS (auth, utilisateurs, cours, réservations, présence, paiements,
                abonnements, coaching, annonces, notifications, configuration, statistiques…)
mobile/         Application Expo (app/(member) (coach) (staff) (admin) = un espace par rôle)
backoffice/     Back-office web React
packages/       shared (types, rôles) et config (tsconfig)
Design System/  Maquettes HTML du design (écrans mobiles, connexion, onboarding, splash)
docs/           Captures d'écran utilisées par ce README
deploy/         Script et gabarits d'onboarding d'un nouveau client
```

## Tests et qualité
```bash
pnpm typecheck     # TypeScript sur tout le monorepo
pnpm lint
pnpm test          # tests unitaires (Vitest)
pnpm --filter @muscleup/api test:e2e
```

## Déploiement
Un déploiement indépendant par salle : `docker-compose.prod.yml` et le script `deploy/onboard-client.sh` (création de l'environnement, clés, import des adhérents, comptes coach / accueil / admin, marque, build et publication de l'app). Détails dans le [document de conception](conception-application-salle-de-sport.md#13-déploiement-et-industrialisation-multi-clients).
