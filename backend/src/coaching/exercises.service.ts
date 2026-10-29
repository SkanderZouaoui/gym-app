import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateExerciseDto } from './dto/create-exercise.dto.js';
import type { UpdateExerciseDto } from './dto/update-exercise.dto.js';

/** Bibliothèque d'exercices (section 4.1/8.5). */
@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    params: { search?: string; muscleGroup?: string[]; equipment?: string[]; includeInactive?: boolean } = {},
  ) {
    const { search, muscleGroup, equipment, includeInactive } = params;
    return this.prisma.exercise.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(muscleGroup?.length ? { muscleGroup: { in: muscleGroup, mode: 'insensitive' } } : {}),
        ...(equipment?.length ? { equipment: { in: equipment, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id }, include: { _count: { select: { programExercises: true } } } });
    if (!exercise) throw new NotFoundException('EXERCISE_NOT_FOUND');
    return { ...exercise, usedInPrograms: exercise._count.programExercises };
  }

  async findMuscleGroups(): Promise<string[]> {
    const rows = await this.prisma.exercise.findMany({
      where: { isActive: true, muscleGroup: { not: null } },
      select: { muscleGroup: true },
      distinct: ['muscleGroup'],
      orderBy: { muscleGroup: 'asc' },
    });
    return rows.map((r) => r.muscleGroup!).filter(Boolean);
  }

  async findEquipment(): Promise<string[]> {
    const rows = await this.prisma.exercise.findMany({
      where: { isActive: true, equipment: { not: null } },
      select: { equipment: true },
      distinct: ['equipment'],
      orderBy: { equipment: 'asc' },
    });
    return rows.map((r) => r.equipment!).filter(Boolean);
  }

  create(dto: CreateExerciseDto, createdById: string) {
    return this.prisma.exercise.create({ data: { ...dto, createdById } });
  }

  async update(id: string, dto: UpdateExerciseDto) {
    await this.findOne(id);
    return this.prisma.exercise.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    return this.prisma.exercise.update({ where: { id }, data: { isActive: false } });
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.exercise.delete({ where: { id } });
  }
}
