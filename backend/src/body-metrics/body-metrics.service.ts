import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateBodyMetricDto } from './dto/create-body-metric.dto.js';

/** Mesures et photos de progression — accès privé par défaut (section 4.1/13). */
@Injectable()
export class BodyMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  create(userId: string, dto: CreateBodyMetricDto) {
    return this.prisma.bodyMetric.create({
      data: {
        userId,
        date: dto.date ? new Date(dto.date) : undefined,
        weightKg: dto.weightKg,
        measurements: dto.measurements ?? {},
        photoKey: dto.photoKey,
        visibility: dto.visibility ?? 'PRIVATE',
      },
    });
  }

  async findForUser(userId: string) {
    const metrics = await this.prisma.bodyMetric.findMany({ where: { userId }, orderBy: { date: 'desc' } });
    return this.withSignedPhotoUrls(metrics);
  }

  /** Visible par le coach uniquement si l'adhérent a partagé (visibility = SHARED_WITH_COACH). */
  async findForMemberByCoach(memberId: string) {
    const metrics = await this.prisma.bodyMetric.findMany({
      where: { userId: memberId, visibility: 'SHARED_WITH_COACH' },
      orderBy: { date: 'desc' },
    });
    return this.withSignedPhotoUrls(metrics);
  }

  async remove(id: string, userId: string) {
    const metric = await this.prisma.bodyMetric.findUnique({ where: { id } });
    if (!metric || metric.userId !== userId) throw new ForbiddenException('NOT_YOUR_METRIC');
    if (metric.photoKey) await this.storageService.deleteObject(metric.photoKey).catch(() => {});
    await this.prisma.bodyMetric.delete({ where: { id } });
  }

  /** La clé S3 brute (photoKey) n'est jamais exposée telle quelle : chaque
   * lecture reçoit une URL présignée à durée limitée (photo privée). */
  private async withSignedPhotoUrls<T extends { photoKey: string | null }>(metrics: T[]) {
    return Promise.all(
      metrics.map(async (m) => ({
        ...m,
        photoUrl: m.photoKey ? await this.storageService.getReadUrl(m.photoKey) : null,
      })),
    );
  }
}
