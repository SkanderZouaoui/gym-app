import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role, type AttendancePolicy } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrganizationService } from '../organization/organization.service.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationService: OrganizationService,
  ) {}

  async create(dto: CreatePaymentDto, actorId: string, actorRole: Role) {
    if (actorRole === Role.STAFF) {
      const settings = await this.organizationService.getSettings();
      const policy = settings.attendancePolicy as unknown as AttendancePolicy;
      if (!policy.staffCanRecordPayments) {
        throw new ForbiddenException('STAFF_PAYMENTS_DISABLED');
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        membershipId: dto.membershipId,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        recordedById: actorId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'RECORD_PAYMENT',
        entity: 'Payment',
        entityId: payment.id,
        newValue: { amount: dto.amount, method: dto.method, membershipId: dto.membershipId },
      },
    });

    return payment;
  }

  findAll() {
    return this.prisma.payment.findMany({
      where: { deletedAt: null },
      include: {
        membership: { include: { user: { select: { firstName: true, lastName: true } }, plan: { select: { name: true } } } },
      },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }

  findForMembership(membershipId: string) {
    return this.prisma.payment.findMany({
      where: { membershipId, deletedAt: null },
      orderBy: { recordedAt: 'desc' },
    });
  }
}
