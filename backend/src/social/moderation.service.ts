import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReportDto } from './dto/create-report.dto.js';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  createReport(dto: CreateReportDto, reportedById: string) {
    return this.prisma.report.create({
      data: {
        reportedById,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
      },
    });
  }

  findOpenReports() {
    return this.prisma.report.findMany({
      where: { status: 'OPEN' },
      include: { reportedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async resolve(id: string, actorId: string, status: 'RESOLVED' | 'DISMISSED') {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('REPORT_NOT_FOUND');

    const updated = await this.prisma.report.update({
      where: { id },
      data: { status, resolvedById: actorId, resolvedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'RESOLVE_REPORT', entity: 'Report', entityId: id, newValue: { status } },
    });

    return updated;
  }
}
