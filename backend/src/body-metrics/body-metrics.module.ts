import { Module } from '@nestjs/common';
import { BodyMetricsService } from './body-metrics.service.js';
import { BodyMetricsController } from './body-metrics.controller.js';

@Module({
  controllers: [BodyMetricsController],
  providers: [BodyMetricsService],
  exports: [BodyMetricsService],
})
export class BodyMetricsModule {}
