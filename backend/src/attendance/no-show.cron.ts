import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceService } from './attendance.service.js';
import { OrganizationService } from '../organization/organization.service.js';
import type { AttendancePolicy } from '@muscleup/shared';

/** Clôture les cours passés et marque les no-show (section 6.7). */
@Injectable()
export class NoShowCron {
  private readonly logger = new Logger(NoShowCron.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly organizationService: OrganizationService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handle() {
    const settings = await this.organizationService.getSettings();
    const policy = settings.attendancePolicy as unknown as AttendancePolicy;
    const result = await this.attendanceService.processNoShows(policy.noShowGraceMinutes);
    if (result.sessionsProcessed > 0) {
      this.logger.log(`No-show: ${result.sessionsProcessed} séance(s) clôturée(s)`);
    }
  }
}
