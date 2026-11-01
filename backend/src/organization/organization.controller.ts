import { Body, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { OrganizationService } from './organization.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { RequestUploadUrlDto } from '../storage/dto/request-upload-url.dto.js';
import { GalleryKeyDto } from '../classes/dto/gallery-key.dto.js';
import { GalleryOrderDto } from '../classes/dto/gallery-order.dto.js';
import { UpdateAttendancePolicyDto } from './dto/update-attendance-policy.dto.js';

@ApiTags('organization')
@Controller('v1/admin/settings')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  getSettings() {
    return this.organizationService.getSettings();
  }

  /** Réglages de la salle avec valeurs par défaut — lisible par tous les rôles (accueil : moyens de paiement). */
  @Get('config')
  getConfig() {
    return this.organizationService.getConfig();
  }

  @Roles(Role.ADMIN)
  @Put('config')
  updateConfig(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationService.updateConfig(body, user.userId);
  }

  @Roles(Role.ADMIN)
  @Get('gallery')
  getGallery() {
    return this.organizationService.getGallery();
  }

  @Roles(Role.ADMIN)
  @Post('gallery/upload-url')
  galleryUploadUrl(@Body() body: RequestUploadUrlDto) {
    return this.organizationService.galleryUploadUrl(body.contentType, body.sizeBytes);
  }

  @Roles(Role.ADMIN)
  @Post('gallery')
  addGalleryImage(@Body() body: GalleryKeyDto) {
    return this.organizationService.addGalleryImage(body.key);
  }

  @Roles(Role.ADMIN)
  @Put('gallery/order')
  reorderGallery(@Body() body: GalleryOrderDto) {
    return this.organizationService.reorderGallery(body.keys);
  }

  @Roles(Role.ADMIN)
  @Delete('gallery')
  removeGalleryImage(@Body() body: GalleryKeyDto) {
    return this.organizationService.removeGalleryImage(body.key);
  }

  @Roles(Role.ADMIN)
  @Get('logo')
  async getLogo() {
    return { logoUrl: (await this.organizationService.getVenue(Role.ADMIN)).logoUrl };
  }

  @Roles(Role.ADMIN)
  @Post('logo/upload-url')
  logoUploadUrl(@Body() body: RequestUploadUrlDto) {
    return this.organizationService.logoUploadUrl(body.contentType, body.sizeBytes);
  }

  @Roles(Role.ADMIN)
  @Put('logo')
  setLogo(@Body() body: GalleryKeyDto) {
    return this.organizationService.setLogo(body.key);
  }

  @Roles(Role.ADMIN)
  @Delete('logo')
  removeLogo() {
    return this.organizationService.removeLogo();
  }

  @Roles(Role.ADMIN)
  @Put('attendance')
  updateAttendancePolicy(
    @Body() dto: UpdateAttendancePolicyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationService.updateAttendancePolicy(dto, user.userId);
  }
}

/** Fiche de la salle, lisible par tout utilisateur connecté (contenu adapté au rôle actif). */
@ApiTags('organization')
@Controller('v1/venue')
export class VenueController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationService.getVenue(user.activeRole);
  }
}
