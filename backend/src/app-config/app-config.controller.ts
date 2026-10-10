import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { AppConfigService } from './app-config.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { PatchAppConfigDto } from './dto/patch-app-config.dto.js';
import { PublishAppConfigDto } from './dto/publish-app-config.dto.js';
import { SetPermissionDto } from './dto/set-permission.dto.js';

@ApiTags('app-config')
@Roles(Role.ADMIN)
@Controller('v1/admin/app-config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get('draft')
  getDraft() {
    return this.appConfigService.getDraft();
  }

  @Patch('draft')
  patchDraft(@Body() dto: PatchAppConfigDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appConfigService.patch(dto, user.userId);
  }

  @Post('draft/discard')
  discardDraft(@CurrentUser() user: AuthenticatedUser) {
    return this.appConfigService.discardDraft(user.userId);
  }

  @Get('history')
  history() {
    return this.appConfigService.history();
  }

  @Post('publish')
  publish(@Body() dto: PublishAppConfigDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appConfigService.publish(dto.note, user.userId);
  }

  @Post('history/:id/restore')
  restore(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appConfigService.restore(id, user.userId);
  }

  @Get('permissions')
  findAllPermissions() {
    return this.appConfigService.findAllPermissions();
  }

  @Patch('permissions')
  setPermission(@Body() dto: SetPermissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appConfigService.setPermission(dto.permission, dto.role, dto.allowed, user.userId);
  }
}
