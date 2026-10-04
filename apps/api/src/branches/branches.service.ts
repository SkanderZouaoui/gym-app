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
}
