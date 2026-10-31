import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from './storage.service.js';

/** Dossiers gérés par l'API. `body-metrics/` : anciennes photos de progression (fonctionnalité supprimée), jamais référencées. */
export const MANAGED_PREFIXES = ['avatars/', 'class-types/', 'body-metrics/'];
/** Un fichier récent peut être en cours d'envoi (pas encore rattaché) : on ne touche qu'aux plus anciens. */
const DEFAULT_MIN_AGE_HOURS = 24;

export interface StoredObject {
  key: string;
  lastModified: Date;
}

/** Fichiers à supprimer : dossier géré, plus vieux que `minAgeMs` et référencé nulle part. */
export function findOrphans(objects: StoredObject[], referenced: Set<string>, now: number, minAgeMs: number): string[] {
  return objects
    .filter((o) => MANAGED_PREFIXES.some((p) => o.key.startsWith(p)) && !referenced.has(o.key) && now - o.lastModified.getTime() >= minAgeMs)
    .map((o) => o.key);
}

/**
 * Supprime chaque nuit les fichiers du stockage que plus rien ne référence (envoi jamais confirmé, appli fermée en
 * cours de route…), pour que le stockage ne grossisse pas pour rien. Garde-fou : si la majorité des fichiers
 * semble orpheline, on n'efface rien (probable anomalie de lecture de la base) et on le signale dans les logs.
 */
@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Cron('30 3 * * *')
  async scheduledRun() {
    try {
      await this.run();
    } catch (err) {
      this.logger.error(`Nettoyage du stockage en échec : ${(err as Error).message}`);
    }
  }

  /** `dryRun` : liste sans supprimer. `minAgeHours` : 24 par défaut (STORAGE_CLEANUP_MIN_AGE_HOURS). */
  async run(options: { dryRun?: boolean; minAgeHours?: number } = {}) {
    const minAgeHours = options.minAgeHours ?? Number(process.env.STORAGE_CLEANUP_MIN_AGE_HOURS ?? DEFAULT_MIN_AGE_HOURS);
    const dryRun = options.dryRun ?? process.env.STORAGE_CLEANUP_DRY_RUN === 'true';

    const objects = (await Promise.all(MANAGED_PREFIXES.map((p) => this.storage.listObjects(p)))).flat();
    const referenced = await this.referencedKeys();
    const orphans = findOrphans(objects, referenced, Date.now(), minAgeHours * 3_600_000);

    if (orphans.length > 10 && orphans.length > objects.length / 2) {
      this.logger.error(`Nettoyage annulé : ${orphans.length}/${objects.length} fichiers semblent orphelins (anomalie probable).`);
      return { listed: objects.length, orphans: orphans.length, deleted: 0, aborted: true };
    }
    if (!dryRun) await Promise.all(orphans.map((key) => this.storage.deleteObject(key).catch((e) => this.logger.warn(`Suppression de ${key} impossible : ${(e as Error).message}`))));
    if (orphans.length > 0) this.logger.log(`${dryRun ? '[simulation] ' : ''}${orphans.length} fichier(s) orphelin(s) ${dryRun ? 'repérés' : 'supprimés'} sur ${objects.length}.`);
    return { listed: objects.length, orphans: orphans.length, deleted: dryRun ? 0 : orphans.length, aborted: false };
  }

  private async referencedKeys(): Promise<Set<string>> {
    const [users, types, exercises] = await Promise.all([
      this.prisma.user.findMany({ where: { photoKey: { not: null } }, select: { photoKey: true } }),
      this.prisma.classType.findMany({ select: { galleryKeys: true, imageKey: true } }),
      this.prisma.exercise.findMany({ where: { mediaKey: { not: null } }, select: { mediaKey: true } }),
    ]);
    const keys = new Set<string>();
    for (const u of users) if (u.photoKey) keys.add(u.photoKey);
    for (const t of types) {
      t.galleryKeys.forEach((k) => keys.add(k));
      if (t.imageKey) keys.add(t.imageKey);
    }
    for (const e of exercises) if (e.mediaKey) keys.add(e.mediaKey);
    return keys;
  }
}
