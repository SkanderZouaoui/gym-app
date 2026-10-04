import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePlanDto } from './dto/create-plan.dto.js';
import type { UpdatePlanDto } from './dto/update-plan.dto.js';
import type { CreateMembershipDto } from './dto/create-membership.dto.js';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Formules (MembershipPlan) ---------------------------------------

  findAllPlans() {
    return this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      include: { branches: true },
      orderBy: { name: 'asc' },
    });
  }

  async findPlan(id: string) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id },
      include: { branches: true },
    });
    if (!plan) throw new NotFoundException('PLAN_NOT_FOUND');
    return plan;
  }

  createPlan(dto: CreatePlanDto) {
    const { branchIds, ...data } = dto;
    return this.prisma.membershipPlan.create({
      data: {
        ...data,
        branches: branchIds ? { create: branchIds.map((branchId) => ({ branchId })) } : undefined,
      },
      include: { branches: true },
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    await this.findPlan(id);
    const { branchIds, ...data } = dto;

    if (branchIds) {
      await this.prisma.planBranch.deleteMany({ where: { planId: id } });
    }

    return this.prisma.membershipPlan.update({
      where: { id },
      data: {
        ...data,
        branches: branchIds ? { create: branchIds.map((branchId) => ({ branchId })) } : undefined,
      },
      include: { branches: true },
    });
  }

  async deactivatePlan(id: string) {
    await this.findPlan(id);
    return this.prisma.membershipPlan.update({ where: { id }, data: { isActive: false } });
  }

  // --- Abonnements (Membership) -----------------------------------------

  async findForUser(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      include: { plan: true, homeBranch: true },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Souscription. Si la formule est contractuelle (`isContractual`), la
   * portée d'accès est figée sur l'abonnement (`frozenAccessScope`) — les
   * changements de règle réseau ne s'appliquent alors pas (section 7.5).
   */
  async create(dto: CreateMembershipDto, actorId: string) {
    const plan = await this.findPlan(dto.planId);
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 86_400_000);

    const membership = await this.prisma.membership.create({
      data: {
        userId: dto.userId,
        planId: dto.planId,
        homeBranchId: dto.homeBranchId,
        startDate,
        endDate,
        status: 'ACTIVE',
        frozenAccessScope: plan.isContractual ? plan.accessScope : null,
      },
      include: { plan: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CREATE_MEMBERSHIP',
        entity: 'Membership',
        entityId: membership.id,
        newValue: { userId: dto.userId, planId: dto.planId },
      },
    });

    return membership;
  }

  async suspend(id: string, actorId: string) {
    await this.findOne(id);
    const membership = await this.prisma.membership.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'SUSPEND_MEMBERSHIP', entity: 'Membership', entityId: id },
    });
    return membership;
  }

  async reactivate(id: string, actorId: string) {
    await this.findOne(id);
    const membership = await this.prisma.membership.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'REACTIVATE_MEMBERSHIP', entity: 'Membership', entityId: id },
    });
    return membership;
  }

  async extend(id: string, days: number, actorId: string) {
    const membership = await this.findOne(id);
    const updated = await this.prisma.membership.update({
      where: { id },
      data: { endDate: new Date(membership.endDate.getTime() + days * 86_400_000) },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'EXTEND_MEMBERSHIP',
        entity: 'Membership',
        entityId: id,
        newValue: { days },
      },
    });
    return updated;
  }

  async findOne(id: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id } });
    if (!membership) throw new NotFoundException('MEMBERSHIP_NOT_FOUND');
    return membership;
  }
}
