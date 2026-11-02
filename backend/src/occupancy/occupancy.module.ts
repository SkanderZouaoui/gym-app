import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OccupancyController } from './occupancy.controller.js';
import { OccupancyService } from './occupancy.service.js';
import { OccupancyCron } from './occupancy.cron.js';
import { PresenceTrackerService } from './presence-tracker.service.js';
import { PresenceInterceptor } from './presence.interceptor.js';

@Module({
  controllers: [OccupancyController],
  providers: [
    OccupancyService,
    OccupancyCron,
    PresenceTrackerService,
    // Global : s'exécute après les guards, donc `request.user` est déjà renseigné.
    { provide: APP_INTERCEPTOR, useClass: PresenceInterceptor },
  ],
  exports: [OccupancyService],
})
export class OccupancyModule {}
