import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { QrKeysService } from './qr-keys.service.js';
import { QrTokenService } from './qr-token.service.js';
import { NoShowCron } from './no-show.cron.js';
import { AccessPolicyModule } from '../access-policy/access-policy.module.js';
import { OrganizationModule } from '../organization/organization.module.js';

@Module({
  imports: [AccessPolicyModule, OrganizationModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, QrKeysService, QrTokenService, NoShowCron],
  exports: [AttendanceService],
})
export class AttendanceModule {}
