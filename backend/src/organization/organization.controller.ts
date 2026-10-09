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

  @Roles(Role.ADMIN)
  @Put('attendance')
  updateAttendancePolicy(
    @Body() dto: UpdateAttendancePolicyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationService.updateAttendancePolicy(dto, user.userId);
  }
}
