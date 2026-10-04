import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateProgramDto } from './dto/create-program.dto.js';

/** Programmes d'entraînement assignés par un coach (section 4.2/8.5). */
@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProgramDto, createdById: string) {
    return this.prisma.program.create({
      data: {
        name: dto.name,
        createdById,
        assignedToId: dto.assignedToId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        days: {
          create: dto.days.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            label: day.label,
            exercises: {
              create: day.exercises.map((ex, index) => ({
                exerciseId: ex.exerciseId,
                order: ex.order ?? index,
                sets: ex.sets,
                reps: ex.reps,
                restSeconds: ex.restSeconds,
                notes: ex.notes,
              })),
            },
          })),
        },
      },
      include: { days: { include: { exercises: { include: { exercise: true } } } } },
    });
  }

  findForMember(memberId: string) {
    return this.prisma.program.findMany({
      where: { assignedToId: memberId },
      include: { days: { include: { exercises: { include: { exercise: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findCreatedByCoach(coachId: string) {
    return this.prisma.program.findMany({
      where: { createdById: coachId },
      include: { assignedTo: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: { days: { include: { exercises: { include: { exercise: true } } } } },
    });
    if (!program) throw new NotFoundException('PROGRAM_NOT_FOUND');
    return program;
  }

  async remove(id: string, coachId: string) {
    const program = await this.findOne(id);
    if (program.createdById !== coachId) throw new ForbiddenException('NOT_YOUR_PROGRAM');
    await this.prisma.program.delete({ where: { id } });
  }
}
