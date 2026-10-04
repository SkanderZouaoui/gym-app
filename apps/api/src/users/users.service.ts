import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Prisma } from '@prisma/client';
import { Role } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePrivilegedUserDto } from './dto/create-privileged-user.dto.js';
import type { AssignRoleDto } from './dto/assign-role.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  photoKey: true,
  homeBranchId: true,
  status: true,
  consents: true,
  createdAt: true,
  branchRoles: { select: { role: true, branchId: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto as Prisma.UserUpdateInput,
      select: PUBLIC_USER_SELECT,
    });
  }

  /** Recherche d'adhérent par nom ou téléphone (section 4.3 — Staff). */
  async search(query: string, branchId?: string) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        ...(branchId ? { homeBranchId: branchId } : {}),
      },
      select: PUBLIC_USER_SELECT,
      take: 25,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return user;
  }

  async suspend(id: string, actorId: string) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: PUBLIC_USER_SELECT,
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'SUSPEND_USER', entity: 'User', entityId: id },
    });
    return user;
  }

  async reactivate(id: string, actorId: string) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: PUBLIC_USER_SELECT,
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'REACTIVATE_USER', entity: 'User', entityId: id },
    });
    return user;
  }

  /** Créé par un admin uniquement — pas d'auto-inscription (section 13). */
  async createPrivilegedUser(dto: CreatePrivilegedUserDto, actorId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, dto.phone ? { phone: dto.phone } : undefined].filter(Boolean) as any },
    });
    if (existing) throw new ConflictException('EMAIL_OR_PHONE_ALREADY_USED');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        homeBranchId: dto.branchId,
        branchRoles: { create: { role: dto.role, branchId: dto.branchId ?? null } },
        ...(dto.role === Role.COACH ? { coachProfile: { create: {} } } : {}),
      },
      select: PUBLIC_USER_SELECT,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CREATE_PRIVILEGED_USER',
        entity: 'User',
        entityId: user.id,
        newValue: { role: dto.role, branchId: dto.branchId ?? null },
      },
    });

    return user;
  }

  async assignRole(userId: string, dto: AssignRoleDto, actorId: string) {
    await this.findOne(userId);

    const grant = await this.prisma.userBranchRole.upsert({
      where: {
        userId_role_branchId: { userId, role: dto.role, branchId: dto.branchId ?? null as any },
      },
      update: {},
      create: { userId, role: dto.role, branchId: dto.branchId },
    });

    if (dto.role === Role.COACH) {
      await this.prisma.coachProfile.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'ASSIGN_ROLE',
        entity: 'User',
        entityId: userId,
        newValue: { role: dto.role, branchId: dto.branchId ?? null },
      },
    });

    return grant;
  }

  async revokeRole(userId: string, role: Role, branchId: string | undefined, actorId: string) {
    await this.prisma.userBranchRole.deleteMany({
      where: { userId, role, branchId: branchId ?? null },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'REVOKE_ROLE',
        entity: 'User',
        entityId: userId,
        oldValue: { role, branchId: branchId ?? null },
      },
    });
  }
}
