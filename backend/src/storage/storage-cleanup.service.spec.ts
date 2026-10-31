import { describe, expect, it, vi } from 'vitest';
import { StorageCleanupService, findOrphans } from './storage-cleanup.service.js';

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 31, 12);
const obj = (key: string, ageHours: number) => ({ key, lastModified: new Date(NOW - ageHours * H) });

describe('findOrphans', () => {
  it('supprime les anciens fichiers non référencés des dossiers gérés', () => {
    const out = findOrphans([obj('avatars/u1/a.jpeg', 30), obj('class-types/t1/b.jpeg', 48)], new Set(), NOW, 24 * H);
    expect(out).toEqual(['avatars/u1/a.jpeg', 'class-types/t1/b.jpeg']);
  });

  it('garde les fichiers référencés, les récents (envoi peut-être en cours) et les dossiers inconnus', () => {
    const objects = [obj('avatars/u1/ok.jpeg', 100), obj('avatars/u2/new.jpeg', 2), obj('autre/x.bin', 500)];
    expect(findOrphans(objects, new Set(['avatars/u1/ok.jpeg']), NOW, 24 * H)).toEqual([]);
  });

  it('supprime les anciennes photos de progression (fonctionnalité retirée)', () => {
    expect(findOrphans([obj('body-metrics/u1/p.jpeg', 72)], new Set(), NOW, 24 * H)).toEqual(['body-metrics/u1/p.jpeg']);
  });
});

describe('StorageCleanupService.run', () => {
  function make(objects: ReturnType<typeof obj>[], refs: { photos?: string[]; gallery?: string[] }) {
    const storage = {
      listObjects: vi.fn(async (prefix: string) => objects.filter((o) => o.key.startsWith(prefix))),
      deleteObject: vi.fn(async () => undefined),
    };
    const prisma = {
      user: { findMany: vi.fn(async () => (refs.photos ?? []).map((photoKey) => ({ photoKey }))) },
      classType: { findMany: vi.fn(async () => [{ galleryKeys: refs.gallery ?? [], imageKey: null }]) },
      exercise: { findMany: vi.fn(async () => []) },
    };
    return { storage, service: new StorageCleanupService(prisma as never, storage as never) };
  }
  // les dates réelles servent ici : minAgeHours = 0 rend tout fichier éligible
  const old = (key: string) => ({ key, lastModified: new Date(Date.now() - 48 * H) });

  it('supprime uniquement les orphelins', async () => {
    const { storage, service } = make([old('avatars/u1/ok.jpeg'), old('avatars/u1/orphan.jpeg'), old('class-types/t/g.jpeg')], { photos: ['avatars/u1/ok.jpeg'], gallery: ['class-types/t/g.jpeg'] });
    const res = await service.run({ minAgeHours: 24 });
    expect(res).toMatchObject({ listed: 3, orphans: 1, deleted: 1, aborted: false });
    expect(storage.deleteObject).toHaveBeenCalledExactlyOnceWith('avatars/u1/orphan.jpeg');
  });

  it('simulation : liste sans supprimer', async () => {
    const { storage, service } = make([old('avatars/u1/orphan.jpeg')], {});
    expect(await service.run({ dryRun: true })).toMatchObject({ orphans: 1, deleted: 0 });
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('garde-fou : refuse d\'effacer si la majorité des fichiers semble orpheline', async () => {
    const many = Array.from({ length: 12 }, (_, i) => old(`avatars/u${i}/f.jpeg`));
    const { storage, service } = make(many, {}); // base lue vide par erreur
    expect(await service.run()).toMatchObject({ aborted: true, deleted: 0 });
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
});
