import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { AppConfigService } from './app-config.service.js';

/**
 * Config publique lue par l'app mobile au démarrage (branding, accueil,
 * navigation, textes, règles) — avant même la connexion, donc sans auth.
 */
@ApiTags('config')
@Controller('v1/config')
export class PublicConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Public()
  @Get()
  getConfig() {
    return this.appConfigService.getPublicConfig();
  }
}
