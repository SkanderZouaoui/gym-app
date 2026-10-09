import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateExerciseDto } from './dto/create-exercise.dto.js';

/** Bibliothèque d'exercices (section 4.1/8.5). */
@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(params: { search?: string; muscleGroup?: string[]; equipment?: string[] } = {}) {
    const { search, muscleGroup, equipment } = params;
    return this.prisma.exercise.findMany({
      where: {
        isActive: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(muscleGroup?.length ? { muscleGroup: { in: muscleGroup, mode: 'insensitive' } } : {}),
        ...(equipment?.length ? { equipment: { in: equipment, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException('EXERCISE_NOT_FOUND');
    return exercise;
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

  async deactivate(id: string) {
    return this.prisma.exercise.update({ where: { id }, data: { isActive: false } });
  }
}
