import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@muscleup/shared';
import { AttendanceService } from './attendance.service.js';
import { QrKeysService } from './qr-keys.service.js';
import { ScanDto } from './dto/scan.dto.js';
import { ManualCheckinDto } from './dto/manual-checkin.dto.js';
import { WalkInDto } from './dto/walk-in.dto.js';
import { SyncDto } from './dto/sync.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';

@ApiTags('attendance')
@Controller('v1')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly qrKeysService: QrKeysService,
  ) {}

  @Get('me/qr-token')
  issueMyQrToken(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.issueMyQrToken(user.userId);
  }

  /** QR de secours longue durée (12h) — à récupérer pendant qu'on est en ligne
   * et conserver en stockage sécurisé côté app pour affichage sans réseau. */
  @Get('me/qr-token/offline')
  issueMyOfflineQrToken(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.issueMyOfflineQrToken(user.userId);
  }

  @Get('me/attendance')
  getMyHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getMyAttendanceHistory(user.userId);
  }

  /** Clés publiques de vérification — accessible sans auth pour le mode hors ligne (section 6.3/6.6). */
  @Public()
  @Get('attendance/jwks')
  getJwks() {
    return this.qrKeysService.getJwks();
  }

  @Roles(Role.COACH, Role.STAFF, Role.ADMIN)
  @Get('sessions/:id/roster')
  getRoster(@Param('id') id: string) {
    return this.attendanceService.getRoster(id);
  }

  @Roles(Role.COACH, Role.STAFF, Role.ADMIN)
  @Post('attendance/scan')
  scan(@Body() dto: ScanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.scan(dto.token, dto.sessionId, user.userId);
  }

  @Roles(Role.COACH, Role.STAFF, Role.ADMIN)
  @Post('attendance/manual')
  manualCheckin(@Body() dto: ManualCheckinDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.manualCheckin(dto, user.userId);
  }

  @Roles(Role.COACH, Role.STAFF, Role.ADMIN)
  @Patch('attendance/:bookingId/cancel')
  cancelAttendance(@Param('bookingId') bookingId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.cancelAttendance(bookingId, user.userId);
  }

  @Roles(Role.COACH, Role.STAFF, Role.ADMIN)
  @Post('attendance/walk-in')
  walkIn(@Body() dto: WalkInDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.walkIn(dto, user.userId);
  }

  @Roles(Role.COACH, Role.STAFF, Role.ADMIN)
  @Post('attendance/sync')
  sync(@Body() dto: SyncDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.sync(dto, user.userId);
  }

  /** Journal des scans pour le back-office (section 11). */
  @Roles(Role.ADMIN)
  @Get('admin/attendance/logs')
  getScanLogs() {
    return this.attendanceService.getScanLogs();
  }
}
