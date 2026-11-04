import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { OrganizationController, VenueContactController, VenueController } from './organization.controller.js';

@Module({
  imports: [StorageModule],
  controllers: [OrganizationController, VenueController, VenueContactController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
