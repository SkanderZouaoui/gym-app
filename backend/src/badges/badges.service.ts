import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateBadgeDto, UpdateBadgeDto } from './dto/badge.dto.js';

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tous les badges (admin). */
  listAll() {
    return this.prisma.profileBadge.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
  }

  /** Badges actifs, affichés dans le profil des adhérents. */
  listActive() {
    return this.prisma.profileBadge.findMany({ where: { isActive: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
  }

  async create(dto: CreateBadgeDto) {
    const last = await this.prisma.profileBadge.aggregate({ _max: { position: true } });
    return this.prisma.profileBadge.create({ data: { ...dto, position: (last._max.position ?? -1) + 1 } });
  }

  async update(id: string, dto: UpdateBadgeDto) {
    const res = await this.prisma.profileBadge.updateMany({ where: { id }, data: dto });
    if (res.count === 0) throw new NotFoundException('BADGE_NOT_FOUND');
    return this.prisma.profileBadge.findUniqueOrThrow({ where: { id } });
  }

  async remove(id: string) {
    const res = await this.prisma.profileBadge.deleteMany({ where: { id } });
    if (res.count === 0) throw new NotFoundException('BADGE_NOT_FOUND');
  }

  /** Nouvel ordre d'affichage : la position de chaque badge devient son rang dans `ids`. */
  async reorder(ids: string[]) {
    await this.prisma.$transaction(ids.map((id, position) => this.prisma.profileBadge.updateMany({ where: { id }, data: { position } })));
    return this.listAll();
  }
}
