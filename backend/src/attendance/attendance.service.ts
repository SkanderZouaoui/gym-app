import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AccessReasonCode } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccessPolicyService } from '../access-policy/access-policy.service.js';
import { QrTokenService } from './qr-token.service.js';
import { generateBookingCode } from '../bookings/booking-code.js';
import { AppEvent, type BookingAttendedEvent, type BookingNoShowEvent } from '../common/events.js';
import type { ManualCheckinDto } from './dto/manual-checkin.dto.js';
import type { WalkInDto } from './dto/walk-in.dto.js';
import type { SyncDto } from './dto/sync.dto.js';

export interface ScanOutcome {
  result: 'GRANTED' | 'DENIED';
  reasonCode: AccessReasonCode;
  member?: { id: string; firstName: string; lastName: string; photoKey: string | null };
  sessionName?: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicyService: AccessPolicyService,
    private readonly qrTokenService: QrTokenService,
    private readonly events: EventEmitter2,
  ) {}

  async issueMyQrToken(userId: string) {
    return this.qrTokenService.issueToken(userId);
  }

  /** QR de secours longue durée à mettre en cache côté app pour le mode hors ligne (section 6.6). */
  async issueMyOfflineQrToken(userId: string) {
    return this.qrTokenService.issueOfflineToken(userId);
  }

  /** Inscrits du jour pour un cours — mis en cache côté app pour le mode hors ligne (section 6.6). */
  async getRoster(sessionId: string) {
    const session = await this.prisma.classSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');

    return this.prisma.booking.findMany({
      where: { sessionId, status: { in: ['CONFIRMED', 'WAITLISTED', 'ATTENDED'] } },
      include: { user: { select: { id: true, firstName: true, lastName: true, photoKey: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Scan QR par coach/staff/admin — POST /v1/attendance/scan (section 6.2/6.4). */
  async scan(token: string, sessionId: string, scannedBy: string, offline = false): Promise<ScanOutcome> {
    const verification = await this.qrTokenService.verifyAndConsume(token);
    if (!verification.valid) {
      await this.logScan(sessionId, null, scannedBy, 'DENIED', verification.reason, offline);
      return { result: 'DENIED', reasonCode: verification.reason };
    }

    return this.evaluateAndCheckIn(sessionId, verification.userId, scannedBy, 'QR', offline);
  }

  /** Pointage manuel (repli si téléphone HS/hors ligne) — section 6.5. */
  async manualCheckin(dto: ManualCheckinDto, scannedBy: string): Promise<ScanOutcome> {
    let userId = dto.userId;

    if (!userId && dto.bookingCode) {
      const booking = await this.prisma.booking.findUnique({ where: { bookingCode: dto.bookingCode } });
      if (!booking || booking.sessionId !== dto.sessionId) {
        await this.logScan(dto.sessionId, null, scannedBy, 'DENIED', 'NO_BOOKING', false);
        return { result: 'DENIED', reasonCode: 'NO_BOOKING' };
      }
      userId = booking.userId;
    }

    if (!userId) throw new BadRequestException('USER_ID_OR_BOOKING_CODE_REQUIRED');

    return this.evaluateAndCheckIn(dto.sessionId, userId, scannedBy, 'MANUAL', false);
  }

  /** Annule une présence enregistrée par erreur — tracé à l'audit (section 6.5). */
  async cancelAttendance(bookingId: string, actorId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('BOOKING_NOT_FOUND');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', attendedAt: null, checkedInBy: null, checkInMethod: null },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CANCEL_ATTENDANCE',
        entity: 'Booking',
        entityId: bookingId,
      },
    });

    return updated;
  }

  /**
   * Inscription + validation sur place si la politique l'autorise et qu'il
   * reste des places (section 6.5, `allowWalkIn`).
   */
  async walkIn(dto: WalkInDto, actorId: string): Promise<ScanOutcome> {
    const session = await this.prisma.classSession.findUnique({ where: { id: dto.sessionId } });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');

    const confirmedCount = await this.prisma.booking.count({
      where: { sessionId: dto.sessionId, status: { in: ['CONFIRMED', 'ATTENDED'] } },
    });
    if (confirmedCount >= session.capacity) {
      return { result: 'DENIED', reasonCode: 'NO_BOOKING' };
    }

    const existing = await this.prisma.booking.findFirst({
      where: { sessionId: dto.sessionId, userId: dto.userId, status: { in: ['CONFIRMED', 'WAITLISTED'] } },
    });

    const booking =
      existing ??
      (await this.prisma.booking.create({
        data: {
          sessionId: dto.sessionId,
          userId: dto.userId,
          status: 'CONFIRMED',
          bookingCode: await this.uniqueBookingCode(),
        },
      }));

    return this.evaluateAndCheckIn(dto.sessionId, dto.userId, actorId, 'WALK_IN', false, booking.id);
  }

  /** Synchronisation groupée des scans réalisés hors ligne (section 6.6). */
  async sync(dto: SyncDto, scannedBy: string) {
    const results = [];
    for (const scan of dto.scans) {
      const existingLog = await this.prisma.attendanceScanLog.findFirst({
        where: { sessionId: scan.sessionId, userId: scan.userId, result: 'GRANTED' },
      });
      if (existingLog) {
        results.push({ sessionId: scan.sessionId, userId: scan.userId, status: 'ALREADY_SYNCED' });
        continue;
      }

      const outcome = await this.evaluateAndCheckIn(
        scan.sessionId,
        scan.userId,
        scannedBy,
        'MANUAL',
        true,
      );
      results.push({ sessionId: scan.sessionId, userId: scan.userId, status: outcome.result });
    }
    return results;
  }

  async getMyAttendanceHistory(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId, status: { in: ['ATTENDED', 'NO_SHOW'] } },
      include: { session: { include: { classType: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Journal des scans acceptés/refusés pour le back-office (section 11). */
  async getScanLogs(take = 100) {
    const logs = await this.prisma.attendanceScanLog.findMany({
      include: {
        session: { select: { startsAt: true, classType: { select: { name: true } } } },
      },
      orderBy: { scannedAt: 'desc' },
      take,
    });

    const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => !!id))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    return logs.map((log) => ({ ...log, user: log.userId ? userById.get(log.userId) ?? null : null }));
  }

  /** Job planifié : clôture les cours passés et marque les absences (section 6.7). */
  async processNoShows(graceMinutesDefault = 15) {
    const cutoff = new Date(Date.now() - graceMinutesDefault * 60_000);

    const sessions = await this.prisma.classSession.findMany({
      where: { status: 'SCHEDULED', endsAt: { lt: cutoff }, noShowProcessedAt: null },
    });

    let processed = 0;
    for (const session of sessions) {
      const noShowBookings = await this.prisma.booking.findMany({
        where: { sessionId: session.id, status: 'CONFIRMED' },
        select: { id: true, userId: true },
      });

      await this.prisma.booking.updateMany({
        where: { sessionId: session.id, status: 'CONFIRMED' },
        data: { status: 'NO_SHOW' },
      });
      await this.prisma.classSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED', noShowProcessedAt: new Date() },
      });

      for (const b of noShowBookings) {
        this.events.emit(AppEvent.BOOKING_NO_SHOW, {
          bookingId: b.id,
          userId: b.userId,
        } satisfies BookingNoShowEvent);
      }

      processed++;
    }
    return { sessionsProcessed: processed };
  }

  // -------------------------------------------------------------------------

  private async evaluateAndCheckIn(
    sessionId: string,
    userId: string,
    scannedBy: string,
    method: 'QR' | 'MANUAL' | 'WALK_IN',
    offline: boolean,
    knownBookingId?: string,
  ): Promise<ScanOutcome> {
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { classType: true },
    });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');

    const booking = knownBookingId
      ? await this.prisma.booking.findUnique({ where: { id: knownBookingId } })
      : await this.prisma.booking.findFirst({
          where: { sessionId, userId, status: { in: ['CONFIRMED', 'WAITLISTED', 'ATTENDED', 'CANCELLED'] } },
          orderBy: { createdAt: 'desc' },
        });

    const membership = await this.prisma.membership.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'SUSPENDED', 'EXPIRED'] } },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    const policyResult = await this.accessPolicyService.evaluateAttendance(booking, session, membership);

    if (!policyResult.allowed) {
      await this.logScan(sessionId, userId, scannedBy, 'DENIED', policyResult.reasonCode, offline);
      return { result: 'DENIED', reasonCode: policyResult.reasonCode };
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: booking!.id },
      data: {
        status: 'ATTENDED',
        attendedAt: new Date(),
        checkedInBy: scannedBy,
        checkInMethod: method,
      },
    });

    await this.logScan(sessionId, userId, scannedBy, 'GRANTED', 'OK', offline);

    this.events.emit(AppEvent.BOOKING_ATTENDED, {
      bookingId: updatedBooking.id,
      userId,
      sessionId,
      classTypeName: session.classType.name,
    } satisfies BookingAttendedEvent);

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, photoKey: true },
    });

    return { result: 'GRANTED', reasonCode: 'OK', member: member ?? undefined };
  }

  private async logScan(
    sessionId: string,
    userId: string | null,
    scannedBy: string,
    result: 'GRANTED' | 'DENIED',
    reasonCode: string,
    offline: boolean,
  ) {
    await this.prisma.attendanceScanLog.create({
      data: { sessionId, userId, scannedBy, result, reasonCode, offline },
    });
  }

  private async uniqueBookingCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateBookingCode();
      const existing = await this.prisma.booking.findUnique({ where: { bookingCode: code } });
      if (!existing) return code;
    }
    throw new BadRequestException('BOOKING_CODE_GENERATION_FAILED');
  }
}
