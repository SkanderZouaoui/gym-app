import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { BodyMetricsService } from './body-metrics.service.js';
import { CreateBodyMetricDto } from './dto/create-body-metric.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('body-metrics')
@Controller('v1')
export class BodyMetricsController {
  constructor(private readonly bodyMetricsService: BodyMetricsService) {}

  @Get('me/body-metrics')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.bodyMetricsService.findForUser(user.userId);
  }

  @Post('me/body-metrics')
  create(@Body() dto: CreateBodyMetricDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bodyMetricsService.create(user.userId, dto);
  }

  @Delete('me/body-metrics/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bodyMetricsService.remove(id, user.userId);
  }

  @Roles(Role.COACH)
  @Get('coach/students/:memberId/body-metrics')
  findForMember(@Param('memberId') memberId: string) {
    return this.bodyMetricsService.findForMemberByCoach(memberId);
  }
}
