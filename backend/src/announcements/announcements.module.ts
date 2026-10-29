import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service.js';
import { AnnouncementsController } from './announcements.controller.js';
import { MyAnnouncementsController } from './my-announcements.controller.js';
import { HomeAlertsController } from './home-alerts.controller.js';
import { HomeAlertsService } from './home-alerts.service.js';

@Module({
  controllers: [AnnouncementsController, MyAnnouncementsController, HomeAlertsController],
  providers: [AnnouncementsService, HomeAlertsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
