import { describe, expect, it } from 'vitest';
import fr from '../i18n/locales/fr.json';
import en from '../i18n/locales/en.json';
import ar from '../i18n/locales/ar.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[path] = v;
    else Object.assign(out, flatten(v, path));
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

const locales = { fr: flatten(fr as Tree), en: flatten(en as Tree), ar: flatten(ar as Tree) };

describe('traductions', () => {
  for (const lang of ['en', 'ar'] as const) {
    it(`${lang} a exactement les mêmes clés que fr`, () => {
      const base = Object.keys(locales.fr);
      const other = new Set(Object.keys(locales[lang]));
      expect(base.filter((k) => !other.has(k))).toEqual([]);
      const known = new Set(base);
      expect([...other].filter((k) => !known.has(k))).toEqual([]);
    });

    // Une langue peut ignorer une variable (le « s » du pluriel français n'existe pas partout), jamais en inventer une :
    // elle s'afficherait telle quelle (« {{v2}} ») à l'écran.
    it(`${lang} n'utilise aucune variable d'interpolation absente de fr`, () => {
      const unknown = Object.keys(locales.fr)
        .filter((k) => locales[lang][k] !== undefined)
        .filter((k) => !placeholders(locales[lang][k]).every((v) => placeholders(locales.fr[k]).includes(v)));
      expect(unknown).toEqual([]);
    });
  }

  it('aucune traduction vide', () => {
    for (const [lang, flat] of Object.entries(locales)) {
      const empty = Object.entries(flat).filter(([, v]) => v.trim() === '').map(([k]) => `${lang}:${k}`);
      expect(empty).toEqual([]);
    }
  });
});
