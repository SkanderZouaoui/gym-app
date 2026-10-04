import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { MembershipsService } from './memberships.service.js';
import { CreatePlanDto } from './dto/create-plan.dto.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';
import { CreateMembershipDto } from './dto/create-membership.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('memberships')
@Controller('v1')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('plans')
  findAllPlans() {
    return this.membershipsService.findAllPlans();
  }

  @Get('plans/:id')
  findPlan(@Param('id') id: string) {
    return this.membershipsService.findPlan(id);
  }

  @Roles(Role.ADMIN)
  @Post('admin/plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.membershipsService.createPlan(dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.membershipsService.updatePlan(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/plans/:id/deactivate')
  deactivatePlan(@Param('id') id: string) {
    return this.membershipsService.deactivatePlan(id);
  }

  @Get('me/memberships')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.findForUser(user.userId);
  }

  @Roles(Role.STAFF, Role.ADMIN)
  @Post('admin/memberships')
  create(@Body() dto: CreateMembershipDto, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.create(dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/memberships/:id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.suspend(id, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/memberships/:id/reactivate')
  reactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.reactivate(id, user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/memberships/:id/extend')
  extend(
    @Param('id') id: string,
    @Body('days') days: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipsService.extend(id, days, user.userId);
  }
}
