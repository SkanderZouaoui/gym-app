import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { AdminService } from './admin.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { BranchScope } from '../auth/decorators/branch-scope.decorator.js';

@ApiTags('admin')
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(Role.ADMIN)
  @BranchScope({ source: 'query', field: 'branchId', optional: true })
  @Get('dashboard')
  dashboard(@Query('branchId') branchId?: string) {
    return this.adminService.dashboard(branchId);
  }

  @Roles(Role.ADMIN)
  @BranchScope({ source: 'query', field: 'branchId', optional: true })
  @Get('alerts/expiring-memberships')
  expiringMemberships(@Query('branchId') branchId?: string) {
    return this.adminService.expiringMemberships(branchId);
  }
}
