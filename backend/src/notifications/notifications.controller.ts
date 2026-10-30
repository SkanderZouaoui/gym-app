import { Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('notifications')
@Controller('v1')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
