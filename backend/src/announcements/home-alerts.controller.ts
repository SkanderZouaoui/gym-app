import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { HomeAlertsService } from './home-alerts.service.js';
import { CreateHomeAlertDto, UpdateHomeAlertDto } from './dto/home-alert.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('home-alerts')
@Controller('v1')
export class HomeAlertsController {
  constructor(private readonly alerts: HomeAlertsService) {}

  /** Formats d'affichage des annonces et alertes de l'accueil adhérent. */
  @Get('me/display-config')
  displayConfig() {
    return this.alerts.displayConfig();
  }

  /** Alertes à afficher en haut de l'accueil de l'adhérent courant. */
  @Get('me/home-alerts')
  findMine(@CurrentUser() user: AuthenticatedUser, @Query('history') history?: string) {
    return this.alerts.findForUser(user.userId, user.activeRole, history === '1');
  }

  @Roles(Role.ADMIN)
  @Get('admin/home-alerts')
  findAll() {
    return this.alerts.findAll();
  }

  @Roles(Role.ADMIN)
  @Post('admin/home-alerts')
  create(@Body() dto: CreateHomeAlertDto) {
    return this.alerts.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/home-alerts/:id')
  update(@Param('id') id: string, @Body() dto: UpdateHomeAlertDto) {
    return this.alerts.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/home-alerts/:id')
  remove(@Param('id') id: string) {
    return this.alerts.remove(id);
  }
}
