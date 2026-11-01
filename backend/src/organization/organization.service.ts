import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service.js';
import { GalleryAssetsService } from '../storage/gallery-assets.service.js';
import { readGalleryMeta, toGalleryJson } from '../storage/gallery-image.js';
import { processLogo } from '../storage/logo-image.js';
import { randomUUID } from 'node:crypto';
import { Role } from '@muscleup/shared';
import { MAX_TYPE_GALLERY, assertSamePermutation } from '../classes/classes.service.js';
import { mergeConfig, organizationConfigSchema } from './organization-config.js';
import { DEFAULT_ATTENDANCE_POLICY, attendancePolicySchema } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateAttendancePolicyDto } from './dto/update-attendance-policy.dto.js';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly gallery: GalleryAssetsService,
  ) {}

  /** OrganizationSettings est une table à une seule ligne (section 8.1). */
  async getSettings() {
    const existing = await this.prisma.organizationSettings.findFirst();
    if (existing) return existing;

    return this.prisma.organizationSettings.create({
      data: {
        name: 'MuscleUP',
        branding: {},
        features: {},
        attendancePolicy: DEFAULT_ATTENDANCE_POLICY,
      },
    });
  }

  async updateAttendancePolicy(dto: UpdateAttendancePolicyDto, updatedBy: string) {
    const parsed = attendancePolicySchema.parse(dto);
    const settings = await this.getSettings();

    const updated = await this.prisma.organizationSettings.update({
      where: { id: settings.id },
      data: {
        attendancePolicy: parsed,
        version: { increment: 1 },
        updatedBy,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: updatedBy,
        action: 'UPDATE_ATTENDANCE_POLICY',
        entity: 'OrganizationSettings',
        entityId: settings.id,
        oldValue: settings.attendancePolicy as any,
        newValue: parsed,
      },
    });

    return updated;
  }

  async getConfig() {
    const settings = await this.getSettings();
    return mergeConfig(settings.config);
  }

  async updateConfig(raw: unknown, updatedBy: string) {
    const parsed = organizationConfigSchema.safeParse(raw);
    if (!parsed.success) {
      const atLeastOne = parsed.error.issues.some((i) => i.message === 'AT_LEAST_ONE_PAYMENT_METHOD');
      throw new BadRequestException(atLeastOne ? 'AT_LEAST_ONE_PAYMENT_METHOD' : 'INVALID_CONFIG');
    }
    const settings = await this.getSettings();
    const updated = await this.prisma.organizationSettings.update({
      where: { id: settings.id },
      data: { config: parsed.data, version: { increment: 1 }, updatedBy },
    });
    await this.prisma.auditLog.create({
      data: { actorId: updatedBy, action: 'UPDATE_ORGANIZATION_CONFIG', entity: 'OrganizationSettings', entityId: settings.id, oldValue: settings.config as any, newValue: parsed.data as any },
    });
    return mergeConfig(updated.config);
  }

  // --- Galerie photos de l'établissement -----------------------------------------

  async getGallery() {
    const { galleryKeys, galleryMeta } = await this.getSettings();
    return this.gallery.withUrls({ galleryKeys, galleryMeta });
  }

  async galleryUploadUrl(contentType: string, sizeBytes: number) {
    const settings = await this.getSettings();
    if (settings.galleryKeys.length >= MAX_TYPE_GALLERY) throw new BadRequestException('GALLERY_FULL');
    if (!/^image\/(jpeg|png|webp)$/.test(contentType)) throw new BadRequestException('INVALID_IMAGE_TYPE');
    const key = this.storage.buildKey('organization/gallery', contentType);
    return { key, uploadUrl: await this.storage.getUploadUrl(key, contentType, sizeBytes) };
  }

  async addGalleryImage(key: string) {
    const settings = await this.getSettings();
    this.storage.assertOwnKey(key, 'organization/gallery');
    if (settings.galleryKeys.includes(key)) return this.getGallery();
    if (settings.galleryKeys.length >= MAX_TYPE_GALLERY) throw new BadRequestException('GALLERY_FULL');
    const meta = await this.gallery.prepare(key);
    await this.prisma.organizationSettings.update({
      where: { id: settings.id },
      data: { galleryKeys: { push: key }, galleryMeta: toGalleryJson({ ...readGalleryMeta(settings.galleryMeta), [key]: meta }) },
    });
    return this.getGallery();
  }

  async reorderGallery(keys: string[]) {
    const settings = await this.getSettings();
    assertSamePermutation(settings.galleryKeys, keys);
    await this.prisma.organizationSettings.update({ where: { id: settings.id }, data: { galleryKeys: keys } });
    return this.getGallery();
  }

  async removeGalleryImage(key: string) {
    const settings = await this.getSettings();
    if (!settings.galleryKeys.includes(key)) return this.getGallery();
    const { [key]: _removed, ...meta } = readGalleryMeta(settings.galleryMeta);
    await this.prisma.organizationSettings.update({
      where: { id: settings.id },
      data: { galleryKeys: settings.galleryKeys.filter((k) => k !== key), galleryMeta: toGalleryJson(meta) },
    });
    await this.gallery.deleteFiles([key]);
    return this.getGallery();
  }

  // --- Logo -----------------------------------------------------------------------

  async logoUploadUrl(contentType: string, sizeBytes: number) {
    const key = this.storage.buildKey('organization/logo', contentType);
    return { key, uploadUrl: await this.storage.getUploadUrl(key, contentType, sizeBytes) };
  }

  /** Enregistre le logo envoyé : réduit et ré-encodé en WebP, l'envoi brut et l'ancien logo sont supprimés. */
  async setLogo(rawKey: string) {
    const settings = await this.getSettings();
    this.storage.assertOwnKey(rawKey, 'organization/logo');
    let processed: Buffer;
    try {
      processed = await processLogo(await this.storage.getObjectBuffer(rawKey));
    } catch (err) {
      await this.storage.deleteObject(rawKey).catch(() => undefined);
      throw err;
    }
    const logoKey = `organization/logo/${randomUUID()}.webp`;
    await this.storage.putObject(logoKey, processed, 'image/webp');
    await this.prisma.organizationSettings.update({ where: { id: settings.id }, data: { logoKey } });
    await Promise.all([rawKey, settings.logoKey].filter((k): k is string => !!k && k !== logoKey).map((k) => this.storage.deleteObject(k).catch(() => undefined)));
    return { logoUrl: await this.storage.getReadUrl(logoKey) };
  }

  async removeLogo() {
    const settings = await this.getSettings();
    if (!settings.logoKey) return { logoUrl: null };
    await this.prisma.organizationSettings.update({ where: { id: settings.id }, data: { logoKey: null } });
    await this.storage.deleteObject(settings.logoKey).catch(() => undefined);
    return { logoUrl: null };
  }

  // --- Fiche de la salle (tous les rôles) ----------------------------------------

  /**
   * Ce que l'application montre de l'établissement : nom, logo, horaires et photos pour tous ; adresse, téléphone et e-mail
   * pour l'équipe (accueil, coach, admin) et, pour un adhérent, seulement si l'admin a coché « visible par les adhérents ».
   */
  async getVenue(role: Role) {
    const settings = await this.getSettings();
    const config = mergeConfig(settings.config);
    const showContact = role !== Role.MEMBER || config.contact.visibleToMembers;
    return {
      name: config.contact.name.trim() || settings.name,
      logoUrl: settings.logoKey ? await this.storage.getReadUrl(settings.logoKey) : null,
      hours: config.hours,
      contact: showContact
        ? {
            address: config.contact.address,
            phone: config.contact.phone,
            email: config.contact.email,
            latitude: config.contact.latitude,
            longitude: config.contact.longitude,
          }
        : null,
      gallery: await this.gallery.withUrls({ galleryKeys: settings.galleryKeys, galleryMeta: settings.galleryMeta }),
    };
  }
}
