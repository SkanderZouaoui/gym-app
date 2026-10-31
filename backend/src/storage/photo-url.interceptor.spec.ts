import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PhotoUrlInterceptor } from './photo-url.interceptor.js';
import type { StorageService } from './storage.service.js';

const http = { getType: () => 'http' } as never;

function run(data: unknown) {
  const storage = { getReadUrl: vi.fn(async (key: string) => `https://s3/${key}?sig=1`) };
  const interceptor = new PhotoUrlInterceptor(storage as unknown as StorageService);
  return { storage, result: lastValueFrom(interceptor.intercept(http, { handle: () => of(data) })) };
}

describe('PhotoUrlInterceptor', () => {
  it('ajoute photoUrl aux objets avec photoKey, à tout niveau (listes, relations)', async () => {
    const { result } = run([
      { id: 1, firstName: 'A', photoKey: 'avatars/1/a.jpeg' },
      { id: 2, membership: { user: { firstName: 'B', photoKey: 'avatars/2/b.jpeg' } } },
    ]);
    const out = (await result) as any[];
    expect(out[0].photoUrl).toBe('https://s3/avatars/1/a.jpeg?sig=1');
    expect(out[1].membership.user.photoUrl).toBe('https://s3/avatars/2/b.jpeg?sig=1');
  });

  it('met photoUrl à null quand il n\'y a pas de photo', async () => {
    const out = (await run({ firstName: 'C', photoKey: null }).result) as any;
    expect(out.photoUrl).toBeNull();
  });

  it('ne touche pas une photoUrl déjà fournie, ni les objets sans photoKey', async () => {
    const { storage, result } = run({ photoKey: 'k', photoUrl: 'déjà', other: { id: 1 } });
    const out = (await result) as any;
    expect(out.photoUrl).toBe('déjà');
    expect(out.other).toEqual({ id: 1 });
    expect(storage.getReadUrl).not.toHaveBeenCalled();
  });

  it('signe une même clé une seule fois par réponse', async () => {
    const { storage, result } = run([{ photoKey: 'k' }, { photoKey: 'k' }, { x: { photoKey: 'k' } }]);
    await result;
    expect(storage.getReadUrl).toHaveBeenCalledTimes(1);
  });

  it('ignore Date et autres instances de classe, et les réponses non objet', async () => {
    const date = new Date();
    const out = (await run({ at: date, n: 3, photoKey: null }).result) as any;
    expect(out.at).toBe(date);
    expect(await run('texte').result).toBe('texte');
    expect(await run(null).result).toBeNull();
  });
});
