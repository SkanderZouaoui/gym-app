import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { ModerationService } from './moderation.service.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('moderation')
@Controller('v1')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  create(@Body() dto: CreateReportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.moderationService.createReport(dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @Get('admin/reports')
  findOpen() {
    return this.moderationService.findOpenReports();
  }

  @Roles(Role.ADMIN)
  @Patch('admin/reports/:id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.moderationService.resolve(id, user.userId, 'RESOLVED');
  }

  @Roles(Role.ADMIN)
  @Patch('admin/reports/:id/dismiss')
  dismiss(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.moderationService.resolve(id, user.userId, 'DISMISSED');
  }
}
