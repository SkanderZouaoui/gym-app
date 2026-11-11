import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { PushService } from './push.service.js';
import { RemindersService } from './reminders.service.js';
import { UpdateNotificationPrefsDto } from './dto/notification-prefs.dto.js';
import { RegisterDeviceTokenDto, RemoveDeviceTokenDto } from './dto/device-token.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('notifications')
@Controller('v1')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly push: PushService,
    private readonly reminders: RemindersService,
  ) {}

  @Get('me/notification-preferences')
  getPrefs(@CurrentUser() user: AuthenticatedUser) {
    return this.reminders.getPrefs(user.userId);
  }

  @Put('me/notification-preferences')
  updatePrefs(@Body() dto: UpdateNotificationPrefsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reminders.updatePrefs(user.userId, dto);
  }

  @Post('me/device-tokens')
  @HttpCode(204)
  async registerDevice(@Body() dto: RegisterDeviceTokenDto, @CurrentUser() user: AuthenticatedUser) {
    await this.push.register(user.userId, dto.token, dto.platform);
  }

  @Delete('me/device-tokens')
  @HttpCode(204)
  async removeDevice(@Body() dto: RemoveDeviceTokenDto, @CurrentUser() user: AuthenticatedUser) {
    await this.push.unregister(user.userId, dto.token);
  }

  @Get('me/notifications')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getMyNotifications(user.userId);
  }

  @Patch('me/notifications/read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.userId);
  }

  @Delete('me/notifications/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.remove(user.userId, id);
  }

  @Patch('me/notifications/:id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(user.userId, id);
  }
}
