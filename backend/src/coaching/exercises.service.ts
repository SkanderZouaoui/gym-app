import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateExerciseDto } from './dto/create-exercise.dto.js';

/** Bibliothèque d'exercices (section 4.1/8.5). */
@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.exercise.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  create(dto: CreateExerciseDto, createdById: string) {
    return this.prisma.exercise.create({ data: { ...dto, createdById } });
  }

  async deactivate(id: string) {
    return this.prisma.exercise.update({ where: { id }, data: { isActive: false } });
  }
}
