import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { generateMemberCode } from '../users/member-code.js';
import * as argon2 from 'argon2';
import { Role } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCoachDto } from './dto/create-coach.dto.js';
import type { UpdateCoachDto } from './dto/update-coach.dto.js';

const COACH_SELECT = {
  userId: true,
  bio: true,
  specialties: true,
  yearsExperience: true,
  sessionPrice: true,
  rating: true,
  reviewCount: true,
  status: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
} as const;

/** Équipe de coachs (back-office "Coachs") — distinct de CoachingModule qui gère
 * les programmes/exercices consommés par les coachs eux-mêmes. */
@Injectable()
export class CoachesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const coaches = await this.prisma.coachProfile.findMany({
      select: COACH_SELECT,
      orderBy: { user: { firstName: 'asc' } },
    });

    const withStats = await Promise.all(
      coaches.map(async (c) => {
        const weeklyClasses = await this.prisma.classTemplate.count({
          where: { coachId: c.userId, isActive: true },
        });
        return { ...c, weeklyClasses };
      }),
    );

    return withStats;
  }

  async findOne(userId: string) {
    const coach = await this.prisma.coachProfile.findUnique({ where: { userId }, select: COACH_SELECT });
    if (!coach) throw new NotFoundException('COACH_NOT_FOUND');
    return coach;
  }

  async create(dto: CreateCoachDto, actorId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, dto.phone ? { phone: dto.phone } : undefined].filter(Boolean) as any },
    });
    if (existing) throw new ConflictException('EMAIL_OR_PHONE_ALREADY_USED');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        memberCode: await generateMemberCode(this.prisma),
        mustChangePassword: true,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: { create: { role: Role.COACH } },
        coachProfile: {
          create: {
            bio: dto.bio,
            specialties: dto.specialties ?? [],
            sessionPrice: dto.sessionPrice,
            status: dto.status ?? 'ACTIVE',
          },
        },
      },
      select: { id: true },
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'CREATE_COACH', entity: 'CoachProfile', entityId: user.id },
    });

    return this.findOne(user.id);
  }

  async update(userId: string, dto: UpdateCoachDto, actorId: string) {
    await this.findOne(userId);

    const { firstName, lastName, email, phone, ...profile } = dto;
    if (firstName || lastName || email || phone) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { firstName, lastName, email, phone },
      });
    }

    await this.prisma.coachProfile.update({ where: { userId }, data: profile });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'UPDATE_COACH', entity: 'CoachProfile', entityId: userId, newValue: dto as any },
    });

    return this.findOne(userId);
  }
}
