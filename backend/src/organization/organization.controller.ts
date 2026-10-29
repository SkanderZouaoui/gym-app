import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { OrganizationService } from './organization.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
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
  @Put('attendance')
  updateAttendancePolicy(
    @Body() dto: UpdateAttendancePolicyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationService.updateAttendancePolicy(dto, user.userId);
  }
}
