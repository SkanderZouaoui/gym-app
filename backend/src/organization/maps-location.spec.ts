import { describe, expect, it } from 'vitest';
import { firstUrl, isAllowedMapsHost, parseLocation, resolveLocation } from './maps-location.js';

const tunis = { latitude: 36.8065, longitude: 10.1815 };

describe('parseLocation', () => {
  it.each([
    'https://www.google.com/maps/place/Tunis/@36.8065,10.1815,15z/data=!3m1',
    'https://www.google.com/maps/place/x/data=!4m2!3d36.8065!4d10.1815',
    'https://maps.google.com/?q=36.8065,10.1815',
    'https://maps.google.com/?q=36.8065%2C10.1815',
    'https://www.google.com/maps/@?api=1&center=36.8065,10.1815',
    '36.8065, 10.1815',
  ])('%s', (text) => expect(parseLocation(text)).toEqual(tunis));
  it('préfère la position du lieu (!3d!4d) à celle de la vue (@)', () => {
    expect(parseLocation('https://www.google.com/maps/place/x/@1.5,2.5,17z/data=!3d36.8065!4d10.1815')).toEqual(tunis);
  });
  it('rien à trouver', () => {
    expect(parseLocation('Bizerte')).toBeNull();
    expect(parseLocation('https://maps.app.goo.gl/abc')).toBeNull();
    expect(parseLocation('99.5, 10')).toBeNull();
  });
});

describe('firstUrl', () => {
  it('extrait le lien d’un texte de partage', () => {
    expect(firstUrl('Iron Gym\nhttps://maps.app.goo.gl/AbC123 \nmerci')).toBe('https://maps.app.goo.gl/AbC123');
    expect(firstUrl('pas de lien')).toBeNull();
  });
});

describe('isAllowedMapsHost', () => {
  it.each(['maps.app.goo.gl', 'www.google.com', 'consent.google.com', 'maps.google.com'])('autorise %s', (h) => expect(isAllowedMapsHost(h)).toBe(true));
  it.each(['evil.com', 'google.com.evil.com', 'localhost', '169.254.169.254', 'notgoogle.com'])('refuse %s', (h) => expect(isAllowedMapsHost(h)).toBe(false));
});

describe('resolveLocation', () => {
  const res = (status: number, headers: Record<string, string> = {}, body = '') => new Response(body, { status, headers });

  it('sans réseau quand la position est dans le texte', async () => {
    const fetcher = (() => {
      throw new Error('ne doit pas être appelé');
    }) as unknown as typeof fetch;
    expect(await resolveLocation('Voici : https://www.google.com/maps/@36.8065,10.1815,17z', fetcher)).toEqual(tunis);
  });
  it('suit un lien court jusqu’à l’adresse finale', async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      return calls.length === 1
        ? res(302, { location: 'https://www.google.com/maps/place/Iron+Gym/@36.8065,10.1815,17z' })
        : res(200);
    }) as unknown as typeof fetch;
    expect(await resolveLocation('https://maps.app.goo.gl/abc', fetcher)).toEqual(tunis);
    expect(calls[0]).toBe('https://maps.app.goo.gl/abc');
  });
  it('lit le début de la page si l’adresse ne contient pas la position', async () => {
    const fetcher = (async () => res(200, {}, '<meta content="https://maps.google.com/maps/api/staticmap?center=36.8065%2C10.1815&amp;zoom=15">')) as unknown as typeof fetch;
    expect(await resolveLocation('https://www.google.com/maps/place/Iron+Gym', fetcher)).toEqual(tunis);
  });
  it('refuse de suivre une redirection vers un autre domaine', async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      return res(302, { location: 'https://evil.example/steal' });
    }) as unknown as typeof fetch;
    await expect(resolveLocation('https://maps.app.goo.gl/abc', fetcher)).rejects.toThrow(/LOCATION_NOT_FOUND/);
    expect(calls).toEqual(['https://maps.app.goo.gl/abc']);
  });
  it('refuse un lien hors Google sans jamais l’appeler', async () => {
    const fetcher = (() => {
      throw new Error('ne doit pas être appelé');
    }) as unknown as typeof fetch;
    await expect(resolveLocation('http://169.254.169.254/latest/meta-data', fetcher)).rejects.toThrow(/LOCATION_NOT_FOUND/);
    await expect(resolveLocation('https://evil.example/steal', fetcher)).rejects.toThrow(/LOCATION_NOT_FOUND/);
  });
  it('échec réseau ou texte sans lien', async () => {
    const boom = (async () => {
      throw new Error('timeout');
    }) as unknown as typeof fetch;
    await expect(resolveLocation('https://maps.app.goo.gl/abc', boom)).rejects.toThrow(/LOCATION_NOT_FOUND/);
    await expect(resolveLocation('Bizerte Nord', boom)).rejects.toThrow(/LOCATION_NOT_FOUND/);
  });
});

describe('lecture du corps de page', () => {
  it('ignore la vue par défaut (@lat,lng) qui n’est pas le lieu', async () => {
    const fetcher = (async () => new Response('<script>["https://www.google.com/maps/@33.98,9.56,6z"]</script>', { status: 200 })) as unknown as typeof fetch;
    await expect(resolveLocation('https://www.google.com/maps/place/Quelque+part', fetcher)).rejects.toThrow(/LOCATION_NOT_FOUND/);
  });
});
