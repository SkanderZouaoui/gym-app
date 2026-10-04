import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateBodyMetricDto } from './dto/create-body-metric.dto.js';

/** Mesures et photos de progression — accès privé par défaut (section 4.1/13). */
@Injectable()
export class BodyMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateBodyMetricDto) {
    return this.prisma.bodyMetric.create({
      data: {
        userId,
        weightKg: dto.weightKg,
        measurements: dto.measurements ?? {},
        photoKey: dto.photoKey,
        visibility: dto.visibility ?? 'PRIVATE',
      },
    });
  }

  findForUser(userId: string) {
    return this.prisma.bodyMetric.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  }

  /** Visible par le coach uniquement si l'adhérent a partagé (visibility = SHARED_WITH_COACH). */
  async findForMemberByCoach(memberId: string) {
    const metrics = await this.prisma.bodyMetric.findMany({
      where: { userId: memberId, visibility: 'SHARED_WITH_COACH' },
      orderBy: { date: 'desc' },
    });
    return metrics;
  }

  async remove(id: string, userId: string) {
    const metric = await this.prisma.bodyMetric.findUnique({ where: { id } });
    if (!metric || metric.userId !== userId) throw new ForbiddenException('NOT_YOUR_METRIC');
    await this.prisma.bodyMetric.delete({ where: { id } });
  }
}
