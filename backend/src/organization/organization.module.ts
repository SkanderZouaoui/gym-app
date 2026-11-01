import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { OrganizationController } from './organization.controller.js';

@Module({
  imports: [StorageModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
