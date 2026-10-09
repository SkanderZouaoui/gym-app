# Origine des données — exercises.json / exercise-gifs.json

Depuis le 2026-10-09 (v2), ces fichiers sont générés par
`scripts/fetch-repdb.py` à partir du dataset gratuit
[RepDB](https://exercise-dataset.com/) (`exercise-dataset.com/exercises.json`,
aucune clé, aucun quota). Licence libre avec attribution obligatoire — voir
[LICENSE-DATA.md](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md) :
usage commercial in-app autorisé, stockage en base autorisé, pas de
redistribution du dataset lui-même, pas d'entraînement d'IA générative sur
les images.

**Attribution requise** (à afficher quelque part dans l'app — écran
crédits/à propos) : *« Exercise data by RepDB (repdb.co) »*.

637 exercices, chacun avec une illustration plate 512×512 WebP (même
personnage, même palette, style homogène sur 100% du catalogue — contrairement
à la source précédente qui mélangeait photos, illustrations et styles
disparates). Image « peak » (pose en contraction) privilégiée, sinon
« main » (étirements) ou « start ».

**Instructions en anglais uniquement** pour l'instant (RepDB fournit
EN/DE/ES, pas de FR) — décision produit : pas de traduction automatique
(un dictionnaire de phrases donnerait un texte de mauvaise qualité), à
traduire manuellement plus tard si besoin plutôt que de dégrader le texte.

Couverture `muscleGroup` : 15 des 19 valeurs backend ont des exercices
(manquent `serratus anterior`, `cardiovascular system`, `levator scapulae` —
absents du vocabulaire muscle de RepDB, resteront sélectionnables seulement
via la liste de chips texte).

Pour régénérer : `python3 prisma/seed-data/scripts/fetch-repdb.py` puis
`npx tsx prisma/seed-data/scripts/replace-exercises.ts` (⚠️ supprime et recrée
entièrement la table `exercises`, ainsi que tout `ProgramExercise`/`WorkoutSet`
qui la référence — à ne lancer que sciemment).

## Sources précédentes (remplacées)

- **wger.de** (2026-10-09, v1, en place quelques heures) : 293 exercices avec
  vidéo HD ou image, mais style visuel hétérogène (contributions wger variées :
  photos, illustrations, plusieurs auteurs) — remplacé car jugé incohérent
  visuellement malgré la bonne résolution.
- **hasaneyldrm/exercises-dataset** (avant le 2026-10-09) : texte extrait de
  [openGym](https://github.com/DuarteSantos8/openGym) (AGPL-3.0-or-later) et
  GIFs 180×180 via jsDelivr — ces GIFs étaient eux-mêmes © Gym visual,
  redistribués sous une permission écrite non transférable au mainteneur de ce
  dépôt tiers (pas une vraie licence). Remplacé pour la qualité du média ET
  pour ce risque juridique.
- **MuscleWiki API** (évaluée, non utilisée) : rendu visuel excellent (vidéo
  HD, un seul style/modèle homogène) mais le tier gratuit interdit tout appel
  direct (y compris le streaming vidéo lui-même, 403) et interdit
  contractuellement le stockage de données/médias ; le premier tier payant
  réellement utilisable en production est à 39,99$/mois (30k appels) — écarté
  pour le coût, à reconsidérer si le budget évolue.
