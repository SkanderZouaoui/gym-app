import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { PushService } from './push.service.js';
import { RemindersService } from './reminders.service.js';
import { NotificationCampaignsService } from './notification-campaigns.service.js';
import { NotificationCampaignsController } from './notification-campaigns.controller.js';

@Module({
  controllers: [NotificationsController, NotificationCampaignsController],
  providers: [NotificationsService, NotificationCampaignsService, PushService, RemindersService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
