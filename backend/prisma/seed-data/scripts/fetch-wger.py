"""Script ponctuel : récupère le catalogue d'exercices wger.de (API publique,
CC-BY-SA, aucune inscription) et génère les fichiers seed-data/exercises.json
et seed-data/exercise-gifs.json dans le même format que l'ancien pipeline
(GIFs hasaneyldrm/exercises-dataset), pour remplacer les GIFs 180x180 par de
vraies vidéos HD (1920x1080) ou images HD (400x400) issues de wger.

Usage : python3 fetch-wger.py (depuis ce dossier). Ne touche à aucune base de
données — écrit uniquement les deux fichiers JSON dans le dossier parent.
"""
import json
import re
import urllib.request
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
SEED_DIR = SCRIPT_DIR.parent

MUSCLE_TO_GROUP = {
    'Shoulders': 'delts',
    'Lats': 'lats',
    'Chest': 'pectorals',
    'Glutes': 'glutes',
    'Biceps': 'biceps',
    'Hamstrings': 'hamstrings',
    'Quads': 'quads',
    'Triceps': 'triceps',
    'Abs': 'abs',
    'Calves': 'calves',
    'Obliquus externus abdominis': 'abs',
    'Trapezius': 'traps',
    'Brachialis': 'biceps',
    'Soleus': 'calves',
    'Serratus anterior': 'serratus anterior',
}

CATEGORY_FALLBACK = {
    'Legs': 'quads',
    'Arms': 'biceps',
    'Back': 'upper back',
    'Cardio': 'cardiovascular system',
    'Shoulders': 'delts',
    'Abs': 'abs',
    'Chest': 'pectorals',
    'Calves': 'calves',
}

FRENCH_LANGUAGE_ID = 12
ENGLISH_LANGUAGE_ID = 2


def fetch_all(endpoint):
    results = []
    url = f'https://wger.de/api/v2/{endpoint}/?format=json&limit=100'
    while url:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.load(resp)
        results.extend(data['results'])
        url = data.get('next')
        time.sleep(0.1)
    return results


def strip_html(text):
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def muscle_group_for(exercise):
    if exercise['muscles']:
        name = exercise['muscles'][0]['name_en'] or exercise['muscles'][0]['name']
        if name in MUSCLE_TO_GROUP:
            return MUSCLE_TO_GROUP[name]
    return CATEGORY_FALLBACK.get(exercise['category']['name'], 'abs')


def translation_for(exercise, language_id):
    return next((t for t in exercise['translations'] if t['language'] == language_id), None)


def best_media_url(exercise):
    """Vidéo HD en priorité, sinon image (taille moyenne), sinon None."""
    videos = [v for v in exercise['videos'] if v]
    if videos:
        return videos[0]['video']
    images = [i for i in exercise['images'] if i]
    if images:
        main_image = next((i for i in images if i.get('is_main')), images[0])
        thumbnails = main_image.get('thumbnails') or {}
        return thumbnails.get('medium') or main_image.get('image')
    return None


def main():
    print('Fetching wger exerciseinfo...')
    exercises = fetch_all('exerciseinfo')
    print(f'{len(exercises)} exercises fetched')

    with_media = [e for e in exercises if e['videos'] or e['images']]
    print(f'{len(with_media)} exercises have video or image media')

    exercises_out = []
    gifs_out = []

    for e in with_media:
        en = translation_for(e, ENGLISH_LANGUAGE_ID)
        fr = translation_for(e, FRENCH_LANGUAGE_ID)
        if not en or not en.get('name'):
            continue

        name = en['name']
        instructions = strip_html(fr['description']) if fr and fr.get('description') else strip_html(en.get('description'))
        equipment = ', '.join(eq['name'] for eq in e['equipment']) if e['equipment'] else ''
        secondary_muscles = [
            (m['name_en'] or m['name']) for m in e['muscles_secondary']
        ]

        exercises_out.append({
            'name': name,
            'muscleGroup': muscle_group_for(e),
            'secondaryMuscles': secondary_muscles,
            'equipment': equipment,
            'instructions': instructions or 'Pas d\'instructions disponibles.',
        })

        media_url = best_media_url(e)
        if media_url:
            gifs_out.append({'name': name, 'gifUrl': media_url})

    exercises_path = SEED_DIR / 'exercises.json'
    gifs_path = SEED_DIR / 'exercise-gifs.json'
    exercises_path.write_text(json.dumps(exercises_out, ensure_ascii=False, indent=2))
    gifs_path.write_text(json.dumps(gifs_out, ensure_ascii=False, indent=2))

    print(f'Wrote {len(exercises_out)} exercises to {exercises_path}')
    print(f'Wrote {len(gifs_out)} media entries to {gifs_path}')
    print('Source: wger.de API (CC-BY-SA 4.0 / CC-BY-SA 3.0, see per-exercise license_author in wger).')


if __name__ == '__main__':
    main()
