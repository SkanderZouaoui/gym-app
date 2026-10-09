import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StorageService } from './storage.service.js';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('storage')
@Controller('v1/me/photos')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /** Génère une URL présignée pour que le téléphone envoie directement sa
   * photo de progression vers le stockage objet, sans passer par l'API —
   * limite le trafic serveur et garde la photo privée (clé non publique). */
  @Post('upload-url')
  async requestUploadUrl(@Body() dto: RequestUploadUrlDto, @CurrentUser() user: AuthenticatedUser) {
    const key = this.storageService.buildKey(`body-metrics/${user.userId}`, dto.contentType);
    const uploadUrl = await this.storageService.getUploadUrl(key, dto.contentType);
    return { key, uploadUrl };
  }

  /** Même mécanisme que les photos de progression, pour les photos jointes
   * à une publication du fil (ex. après une séance d'entraînement). */
  @Post('post-upload-url')
  async requestPostUploadUrl(@Body() dto: RequestUploadUrlDto, @CurrentUser() user: AuthenticatedUser) {
    const key = this.storageService.buildKey(`posts/${user.userId}`, dto.contentType);
    const uploadUrl = await this.storageService.getUploadUrl(key, dto.contentType);
    return { key, uploadUrl };
  }
}
