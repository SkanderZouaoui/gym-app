import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateBranchDto } from './dto/create-branch.dto.js';
import type { UpdateBranchDto } from './dto/update-branch.dto.js';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('BRANCH_NOT_FOUND');
    return branch;
  }

  create(dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: dto });
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.branch.update({ where: { id }, data: { isActive: false } });
  }

  /** Affluence estimée : comptage des pointages d'entrée (QR/manuel) acceptés
   * sur une fenêtre glissante de 2 h, faute de capteurs de sortie en temps réel
   * (section 4.3 — reconnu comme approximation, pas une mesure exacte). */
  async getOccupancy(branchId: string) {
    const branch = await this.findOne(branchId);
    const now = new Date();
    const windowStart = new Date(now.getTime() - 2 * 60 * 60_000);

    const currentCount = await this.prisma.attendanceScanLog.count({
      where: {
        result: 'GRANTED',
        scannedAt: { gte: windowStart, lte: now },
        session: { branchId },
      },
    });

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const todayScans = await this.prisma.attendanceScanLog.findMany({
      where: { result: 'GRANTED', scannedAt: { gte: dayStart, lte: now }, session: { branchId } },
      select: { scannedAt: true },
    });
    const hourly = Array(24).fill(0);
    for (const scan of todayScans) hourly[scan.scannedAt.getHours()]++;

    const capacity = branch.maxCapacity ?? null;
    const percent = capacity ? Math.min(100, Math.round((currentCount / capacity) * 100)) : null;

    return {
      branchId,
      branchName: branch.name,
      capacity,
      currentCount,
      percent,
      hourly,
      updatedAt: now.toISOString(),
    };
  }
}
