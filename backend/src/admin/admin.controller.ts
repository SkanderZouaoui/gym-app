import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { AdminService } from './admin.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('admin')
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(Role.ADMIN)
  @Get('dashboard')
  dashboard() {
    return this.adminService.dashboard();
  }

  @Roles(Role.ADMIN)
  @Get('alerts/expiring-memberships')
  expiringMemberships() {
    return this.adminService.expiringMemberships();
  }
}
