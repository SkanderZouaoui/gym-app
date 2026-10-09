import { Module } from '@nestjs/common';
import { BodyMetricsService } from './body-metrics.service.js';
import { BodyMetricsController } from './body-metrics.controller.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [BodyMetricsController],
  providers: [BodyMetricsService],
  exports: [BodyMetricsService],
})
export class BodyMetricsModule {}
