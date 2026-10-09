import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

/** Annonces reçues par l'adhérent courant (ciblage par site/formule, section accueil). */
@ApiTags('announcements')
@Controller('v1/me/announcements')
export class MyAnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.announcementsService.findForMember(user.userId);
  }
}
