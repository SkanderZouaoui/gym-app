import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { StatsService } from './stats.service.js';
import { StatsQueryDto } from './dto/stats-query.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { BranchScope } from '../auth/decorators/branch-scope.decorator.js';

@ApiTags('stats')
@Controller('v1/admin/stats')
@Roles(Role.ADMIN)
@BranchScope({ source: 'query', field: 'branchId', optional: true })
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  getOverview(@Query() query: StatsQueryDto) {
    return this.statsService.getOverview({
      branchId: query.branchId,
      from: new Date(query.from),
      to: new Date(query.to),
    });
  }

  @Get('attendance')
  getAttendance(@Query() query: StatsQueryDto) {
    return this.statsService.getAttendanceStats({
      branchId: query.branchId,
      from: new Date(query.from),
      to: new Date(query.to),
    });
  }

  @Get('revenue')
  getRevenue(@Query() query: StatsQueryDto) {
    return this.statsService.getRevenueStats({
      branchId: query.branchId,
      from: new Date(query.from),
      to: new Date(query.to),
    });
  }

  @Get('new-members')
  getNewMembers(@Query() query: StatsQueryDto) {
    return this.statsService.getNewMembersStats({
      branchId: query.branchId,
      from: new Date(query.from),
      to: new Date(query.to),
    });
  }

  @Get('retention')
  getRetention(@Query() query: StatsQueryDto) {
    return this.statsService.getRetentionStats({ branchId: query.branchId, to: new Date(query.to) });
  }

  /** Présences des 7 derniers jours + variation vs semaine précédente — accueil admin mobile. */
  @Get('daily-attendance')
  getDailyAttendance(@Query('branchId') branchId?: string) {
    return this.statsService.getDailyAttendance(branchId);
  }

  @Get('export/payments.csv')
  async exportPayments(@Query() query: StatsQueryDto, @Res() res: Response) {
    const csv = await this.statsService.exportPaymentsCsv({
      branchId: query.branchId,
      from: new Date(query.from),
      to: new Date(query.to),
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="encaissements.csv"');
    res.send(csv);
  }
}
