import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ALL_ROLES,
  appConfigContentSchema,
  bookingRulesSchema,
  brandingSchema,
  DEFAULT_APP_CONFIG_CONTENT,
  homeModuleSchema,
  languagesSchema,
  notifSettingsSchema,
  tabSchema,
  appStringSchema,
  type AppConfigContent,
  type Role,
} from '@muscleup/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PatchAppConfigDto } from './dto/patch-app-config.dto.js';

const SECTION_SCHEMAS = {
  branding: brandingSchema,
  homeModules: z.array(homeModuleSchema),
  tabs: z.array(tabSchema),
  strings: z.array(appStringSchema),
  languages: languagesSchema,
  notifSettings: notifSettingsSchema,
  bookingRules: bookingRulesSchema,
} as const;

type SectionKey = keyof typeof SECTION_SCHEMAS;

/** Permissions pilotables au-delà du socle @Roles() — ADMIN les a toutes, non stockées. */
export const MANAGEABLE_PERMISSIONS = [
  'classes.viewPlanning',
  'classes.book',
  'attendance.manage',
  'attendance.scanQr',
  'payments.record',
  'classes.cancel',
  'members.suspend',
  'appConfig.edit',
  'appConfig.publish',
  'stats.financial',
] as const;

const MANAGEABLE_ROLES = ALL_ROLES.filter((r) => r !== 'ADMIN') as Role[];

/**
 * CMS de configuration de l'app mobile (back-office "Application" : identité
 * visuelle, accueil, navigation, textes, notifications, règles). Modèle
 * brouillon/publication : il existe toujours un AppConfigVersion DRAFT
 * (versionNumber 0) modifiable librement, et au plus un PUBLISHED actif que
 * l'app mobile lit via /v1/config.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** Le brouillon courant, créé à la volée s'il n'existe pas encore. */
  async getDraft() {
    const existing = await this.prisma.appConfigVersion.findFirst({ where: { status: 'DRAFT' } });
    if (existing) return existing;

    const live = await this.prisma.appConfigVersion.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { versionNumber: 'desc' },
    });

    return this.prisma.appConfigVersion.create({
      data: {
        status: 'DRAFT',
        versionNumber: 0,
        branding: live?.branding ?? DEFAULT_APP_CONFIG_CONTENT.branding,
        homeModules: live?.homeModules ?? DEFAULT_APP_CONFIG_CONTENT.homeModules,
        tabs: live?.tabs ?? DEFAULT_APP_CONFIG_CONTENT.tabs,
        strings: live?.strings ?? DEFAULT_APP_CONFIG_CONTENT.strings,
        languages: live?.languages ?? DEFAULT_APP_CONFIG_CONTENT.languages,
        notifSettings: live?.notifSettings ?? DEFAULT_APP_CONFIG_CONTENT.notifSettings,
        bookingRules: live?.bookingRules ?? DEFAULT_APP_CONFIG_CONTENT.bookingRules,
        changedKeys: [],
      },
    });
  }

  /** Dernière version publiée (celle que lit l'app mobile) — null si rien n'a jamais été publié. */
  getLive() {
    return this.prisma.appConfigVersion.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { versionNumber: 'desc' },
    });
  }

  /** Config publique consommée par l'app mobile : la version live, ou les valeurs par défaut sinon. */
  async getPublicConfig(): Promise<AppConfigContent & { version: number; publishedAt: string | null }> {
    const live = await this.getLive();
    if (!live) return { ...DEFAULT_APP_CONFIG_CONTENT, version: 0, publishedAt: null };

    return {
      branding: live.branding as AppConfigContent['branding'],
      homeModules: live.homeModules as AppConfigContent['homeModules'],
      tabs: live.tabs as AppConfigContent['tabs'],
      strings: live.strings as AppConfigContent['strings'],
      languages: live.languages as AppConfigContent['languages'],
      notifSettings: live.notifSettings as AppConfigContent['notifSettings'],
      bookingRules: live.bookingRules as AppConfigContent['bookingRules'],
      version: live.versionNumber,
      publishedAt: live.publishedAt?.toISOString() ?? null,
    };
  }

  async history() {
    return this.prisma.appConfigVersion.findMany({
      where: { status: { in: ['PUBLISHED', 'ARCHIVED'] } },
      orderBy: { versionNumber: 'desc' },
      include: { publishedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async patch(dto: PatchAppConfigDto, actorId: string) {
    const draft = await this.getDraft();
    const data: Record<string, unknown> = {};
    const changedKeys = new Set<string>(Array.isArray(draft.changedKeys) ? (draft.changedKeys as string[]) : []);

    for (const key of Object.keys(SECTION_SCHEMAS) as SectionKey[]) {
      const value = dto[key];
      if (value === undefined) continue;
      const schema = SECTION_SCHEMAS[key] as z.ZodType<unknown>;
      data[key] = schema.parse(value);
      changedKeys.add(dto.changeLabel ?? key);
    }

    if (Object.keys(data).length === 0) return draft;

    const updated = await this.prisma.appConfigVersion.update({
      where: { id: draft.id },
      data: { ...data, changedKeys: Array.from(changedKeys) },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'PATCH_APP_CONFIG_DRAFT',
        entity: 'AppConfigVersion',
        entityId: draft.id,
        newValue: data as any,
      },
    });

    return updated;
  }

  /** Réinitialise le brouillon sur l'état de la dernière version publiée (bouton "Tout annuler"). */
  async discardDraft(actorId: string) {
    const draft = await this.getDraft();
    const live = await this.getLive();
    const base = live ?? { ...DEFAULT_APP_CONFIG_CONTENT, publishedById: null };

    const updated = await this.prisma.appConfigVersion.update({
      where: { id: draft.id },
      data: {
        branding: base.branding as any,
        homeModules: base.homeModules as any,
        tabs: base.tabs as any,
        strings: base.strings as any,
        languages: base.languages as any,
        notifSettings: base.notifSettings as any,
        bookingRules: base.bookingRules as any,
        changedKeys: [],
      },
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'DISCARD_APP_CONFIG_DRAFT', entity: 'AppConfigVersion', entityId: draft.id },
    });

    return updated;
  }

  /** Publie le brouillon : devient la nouvelle version PUBLISHED, l'ancienne passe en ARCHIVED. */
  async publish(note: string | undefined, actorId: string) {
    const draft = await this.getDraft();
    const content = appConfigContentSchema.parse({
      branding: draft.branding,
      homeModules: draft.homeModules,
      tabs: draft.tabs,
      strings: draft.strings,
      languages: draft.languages,
      notifSettings: draft.notifSettings,
      bookingRules: draft.bookingRules,
    });

    const currentLive = await this.getLive();
    const nextVersionNumber = (currentLive?.versionNumber ?? 0) + 1;

    const [, , published] = await this.prisma.$transaction([
      this.prisma.appConfigVersion.updateMany({
        where: { status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' },
      }),
      this.prisma.appConfigVersion.delete({ where: { id: draft.id } }),
      this.prisma.appConfigVersion.create({
        data: {
          status: 'PUBLISHED',
          versionNumber: nextVersionNumber,
          note: note?.trim() || 'Mise à jour du contenu',
          publishedById: actorId,
          publishedAt: new Date(),
          ...content,
          changedKeys: [],
        },
      }),
    ]);

    // Recrée immédiatement un brouillon propre basé sur la version qui vient d'être publiée.
    await this.prisma.appConfigVersion.create({
      data: {
        status: 'DRAFT',
        versionNumber: 0,
        ...content,
        changedKeys: [],
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'PUBLISH_APP_CONFIG',
        entity: 'AppConfigVersion',
        entityId: published.id,
        newValue: { versionNumber: nextVersionNumber, note: published.note },
      },
    });

    return published;
  }

  /** Restaure une ancienne version publiée dans le brouillon courant (sans republier). */
  async restore(versionId: string, actorId: string) {
    const version = await this.prisma.appConfigVersion.findUnique({ where: { id: versionId } });
    if (!version || version.status === 'DRAFT') throw new NotFoundException('Version introuvable');

    const draft = await this.getDraft();
    const updated = await this.prisma.appConfigVersion.update({
      where: { id: draft.id },
      data: {
        branding: version.branding as any,
        homeModules: version.homeModules as any,
        tabs: version.tabs as any,
        strings: version.strings as any,
        languages: version.languages as any,
        notifSettings: version.notifSettings as any,
        bookingRules: version.bookingRules as any,
        changedKeys: [`Restauration de v${version.versionNumber}`],
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'RESTORE_APP_CONFIG_VERSION',
        entity: 'AppConfigVersion',
        entityId: version.id,
      },
    });

    return updated;
  }

  // --- Rôles & permissions --------------------------------------------------

  /** Matrice complète permission × rôle, complétée avec `allowed: false` pour
   * toute combinaison jamais explicitement enregistrée. */
  async findAllPermissions() {
    const rows = await this.prisma.rolePermission.findMany();
    const byKey = new Map(rows.map((r) => [`${r.permission}:${r.role}`, r.allowed]));

    return MANAGEABLE_PERMISSIONS.map((permission) => ({
      permission,
      roles: MANAGEABLE_ROLES.map((role) => ({
        role,
        allowed: byKey.get(`${permission}:${role}`) ?? false,
      })),
    }));
  }

  async setPermission(permission: string, role: Role, allowed: boolean, actorId: string) {
    if (role === 'ADMIN') return; // ADMIN a toujours tout, non pilotable

    const updated = await this.prisma.rolePermission.upsert({
      where: { permission_role: { permission, role } },
      update: { allowed },
      create: { permission, role, allowed },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'SET_ROLE_PERMISSION',
        entity: 'RolePermission',
        entityId: updated.id,
        newValue: { permission, role, allowed },
      },
    });

    return updated;
  }
}
