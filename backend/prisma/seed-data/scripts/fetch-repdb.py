"""Script ponctuel : récupère le dataset gratuit RepDB (exercise-dataset.com,
licence libre avec attribution, voir prisma/seed-data/README.md) et génère
exercises.json / exercise-gifs.json dans le même format que l'ancien pipeline,
pour un style visuel homogène (illustrations plates, même personnage, même
palette) sur 100% des exercices — contrairement à wger qui mélangeait photos,
illustrations et styles disparates.

RepDB ne fournit pas d'instructions en français (EN/DE/ES uniquement) :
décision produit (2026-10-09) de garder les instructions en anglais pour
l'instant plutôt que de les traduire automatiquement (un dictionnaire de
phrases regex donnerait un texte bancal, pas une vraie traduction) — à
traduire manuellement plus tard si besoin.

Usage : python3 fetch-repdb.py (depuis ce dossier). Les images restent
hébergées sur exercise-dataset.com (GitHub Pages, pas de clé, pas de quota) —
mediaKey pointe directement vers ces URLs, comme pour l'ancien pipeline GIF.
"""
import json
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
SEED_DIR = SCRIPT_DIR.parent
DATASET_URL = 'https://exercise-dataset.com/exercises.json'
IMAGE_BASE = 'https://exercise-dataset.com/'

MUSCLE_TO_GROUP = {
    'gluteus_maximus': 'glutes',
    'gluteus_medius': 'glutes',
    'quadriceps': 'quads',
    'pectoralis_major': 'pectorals',
    'latissimus_dorsi': 'lats',
    'anterior_deltoid': 'delts',
    'lateral_deltoid': 'delts',
    'posterior_deltoid': 'delts',
    'rectus_abdominis': 'abs',
    'transverse_abdominis': 'abs',
    'obliques': 'abs',
    'hamstrings': 'hamstrings',
    'triceps_brachii': 'triceps',
    'erector_spinae': 'spine',
    'quadratus_lumborum': 'spine',
    'biceps_brachii': 'biceps',
    'brachialis': 'biceps',
    'brachioradialis': 'biceps',
    'trapezius': 'traps',
    'hip_flexors': 'quads',
    'rhomboids': 'upper back',
    'gastrocnemius': 'calves',
    'soleus': 'calves',
    'tibialis_anterior': 'calves',
    'adductors': 'adductors',
    'abductors': 'abductors',
    'forearm_flexors': 'forearms',
    'forearm_extensors': 'forearms',
}

BODY_PART_FALLBACK = {
    'upper_legs': 'quads',
    'back': 'upper back',
    'core': 'abs',
    'shoulders': 'delts',
    'upper_arms': 'biceps',
    'chest': 'pectorals',
    'lower_legs': 'calves',
    'lower_arms': 'forearms',
    'full_body': 'abs',
}

def fetch_json(url):
    with urllib.request.urlopen(url, timeout=30) as resp:
        return json.load(resp)


def muscle_group_for(exercise):
    for muscle in exercise['primary_muscles']:
        if muscle in MUSCLE_TO_GROUP:
            return MUSCLE_TO_GROUP[muscle]
    return BODY_PART_FALLBACK.get(exercise['body_part'], 'abs')


def best_image_path(exercise):
    flat = exercise.get('images', {}).get('flat', {})
    return flat.get('peak') or flat.get('main') or flat.get('start')


def main():
    print('Fetching RepDB dataset...')
    data = fetch_json(DATASET_URL)
    exercises = data['exercises']
    print(f'{len(exercises)} exercises fetched')

    exercises_out = []
    gifs_out = []

    for e in exercises:
        image_path = best_image_path(e)
        if not image_path:
            continue

        name = e['name_en']
        instructions = ' '.join(e.get('instructions_en', []))
        secondary_muscles = e.get('secondary_muscles', [])
        # RepDB laisse `equipment` vide pour les mouvements au poids du corps
        # plutôt que d'y mettre une valeur explicite — `is_bodyweight` est le
        # signal fiable, pas l'absence de valeur (qui pourrait aussi être une
        # donnée manquante).
        equipment = e.get('equipment') or ('bodyweight' if e.get('is_bodyweight') else '')

        exercises_out.append({
            'name': name,
            'muscleGroup': muscle_group_for(e),
            'secondaryMuscles': secondary_muscles,
            'equipment': equipment,
            'instructions': instructions or 'No instructions available.',
        })

        gifs_out.append({'name': name, 'gifUrl': IMAGE_BASE + image_path})

    exercises_path = SEED_DIR / 'exercises.json'
    gifs_path = SEED_DIR / 'exercise-gifs.json'
    exercises_path.write_text(json.dumps(exercises_out, ensure_ascii=False, indent=2))
    gifs_path.write_text(json.dumps(gifs_out, ensure_ascii=False, indent=2))

    print(f'Wrote {len(exercises_out)} exercises to {exercises_path}')
    print(f'{len(gifs_out)} exercises have an image URL (exercise-dataset.com).')
    print('Source: RepDB free tier (exercise-dataset.com, CC-style attribution license).')
    print('N\'oublie pas l\'attribution requise : "Exercise data by RepDB (repdb.co)".')


if __name__ == '__main__':
    main()
