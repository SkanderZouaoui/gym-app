import { Body, Controller, Delete, ForbiddenException, Get, Patch, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Role } from '@muscleup/shared';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { OccupancyService } from './occupancy.service.js';
import { SetOccupancyOverrideDto } from './dto/set-occupancy-override.dto.js';
import { UpdateOccupancyPolicyDto } from './dto/update-occupancy-policy.dto.js';
import { clientIp } from './client-ip.js';

/** Estimation de l'occupation (approximation, jamais un comptage exact). Déploiement mono-site. */
@ApiTags('occupancy')
@Controller('v1')
export class OccupancyController {
  constructor(private readonly occupancy: OccupancyService) {}

  /** Accueil et admin : estimation détaillée. Adhérent : chiffre seul, si l'admin l'a activé. */
  @Roles(Role.STAFF, Role.ADMIN, Role.MEMBER)
  @Get('occupancy')
  async get(@CurrentUser() user: AuthenticatedUser) {
    if (user.activeRole === Role.MEMBER) {
      const view = await this.occupancy.memberEstimate();
      if (!view) throw new ForbiddenException('OCCUPANCY_NOT_VISIBLE');
      return view;
    }
    return this.occupancy.estimate();
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Patch('admin/occupancy/override')
  setOverride(@Body() dto: SetOccupancyOverrideDto, @CurrentUser() user: AuthenticatedUser) {
    return this.occupancy.setManualOverride(dto.count, user.userId, dto.durationMinutes, dto.note);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Delete('admin/occupancy/override')
  clearOverride(@CurrentUser() user: AuthenticatedUser) {
    return this.occupancy.clearManualOverride(user.userId);
  }

  /** `requestIp` : IP vue par le serveur pour cette requête — « utiliser mon IP actuelle » depuis le WiFi de la salle. */
  @Roles(Role.ADMIN)
  @Get('admin/settings/occupancy-policy')
  async getPolicy(@Req() req: Request) {
    return { ...(await this.occupancy.getPolicy()), requestIp: clientIp(req) };
  }

  @Roles(Role.ADMIN)
  @Put('admin/settings/occupancy-policy')
  async updatePolicy(@Body() dto: UpdateOccupancyPolicyDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return { ...(await this.occupancy.updatePolicy(dto, user.userId)), requestIp: clientIp(req) };
  }
}
