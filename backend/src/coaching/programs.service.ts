import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateProgramDto } from './dto/create-program.dto.js';
import type { CreateOwnProgramDto } from './dto/create-own-program.dto.js';

const EXERCISE_INCLUDE = {
  days: { include: { exercises: { include: { exercise: true, setDetails: { orderBy: { setNumber: 'asc' as const } } } } } },
};

function mapDays(days: CreateProgramDto['days'] | CreateOwnProgramDto['days']) {
  return days.map((day) => ({
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
        setDetails: ex.setDetails?.length
          ? {
              create: ex.setDetails.map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps,
                weightKg: s.weightKg,
                restSeconds: s.restSeconds,
              })),
            }
          : undefined,
      })),
    },
  }));
}

/** Programmes d'entraînement assignés par un coach (section 4.2/8.5). */
@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Programme créé par un coach : soumis à la validation de l'admin avant d'être visible des adhérents.
   * Sans destinataire, il est destiné à tous les adhérents (rubrique « Proposés »). */
  create(dto: CreateProgramDto, createdById: string) {
    return this.prisma.program.create({
      data: {
        name: dto.name,
        createdById,
        assignedToId: dto.assignedToId ?? createdById,
        isPublic: !dto.assignedToId,
        level: dto.level,
        goal: dto.goal,
        status: 'PENDING',
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        days: { create: mapDays(dto.days) },
      },
      include: EXERCISE_INCLUDE,
    });
  }

  /** Programmes de l'adhérent : les siens et ceux que ses coachs lui ont assignés une fois validés. */
  findForMember(memberId: string) {
    return this.prisma.program.findMany({
      where: { assignedToId: memberId, status: 'APPROVED', isPublic: false },
      include: EXERCISE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Programmes « Proposés » : validés par l'admin et visibles par tous les adhérents. */
  findProposed() {
    return this.prisma.program.findMany({
      where: { status: 'APPROVED', isPublic: true },
      include: EXERCISE_INCLUDE,
      orderBy: { reviewedAt: 'desc' },
    });
  }

  findCreatedByCoach(coachId: string) {
    return this.prisma.program.findMany({
      where: { createdById: coachId, NOT: { assignedToId: coachId, isPublic: false } },
      include: { ...EXERCISE_INCLUDE, assignedTo: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Validation par l'admin ------------------------------------------------

  findForReview(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.program.findMany({
      where: { createdBy: { roles: { some: { role: 'COACH' } } }, ...(status ? { status } : {}) },
      include: {
        ...EXERCISE_INCLUDE,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string) {
    await this.findOne(id);
    return this.prisma.program.update({
      where: { id },
      data: { status: 'APPROVED', rejectionNote: null, reviewedAt: new Date() },
    });
  }

  async reject(id: string, note?: string) {
    await this.findOne(id);
    return this.prisma.program.update({
      where: { id },
      data: { status: 'REJECTED', rejectionNote: note ?? null, reviewedAt: new Date() },
    });
  }

  async findOne(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: EXERCISE_INCLUDE,
    });
    if (!program) throw new NotFoundException('PROGRAM_NOT_FOUND');
    return program;
  }

  async remove(id: string, coachId: string) {
    const program = await this.findOne(id);
    if (program.createdById !== coachId) throw new ForbiddenException('NOT_YOUR_PROGRAM');
    await this.prisma.program.delete({ where: { id } });
  }

  /** Programme personnel composé par l'adhérent lui-même (createdById === assignedToId). */
  createOwn(dto: CreateOwnProgramDto, memberId: string) {
    return this.prisma.program.create({
      data: {
        name: dto.name,
        createdById: memberId,
        assignedToId: memberId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        days: { create: mapDays(dto.days) },
      },
      include: EXERCISE_INCLUDE,
    });
  }

  /** Modifie un programme personnel : remplace entièrement ses jours/exercices
   * (plus simple et fiable qu'un diff partiel, cohérent avec le composeur qui
   * renvoie toujours l'état complet du programme). */
  async updateOwn(id: string, dto: CreateOwnProgramDto, memberId: string) {
    const program = await this.findOne(id);
    if (program.createdById !== memberId || program.assignedToId !== memberId) {
      throw new ForbiddenException('NOT_YOUR_PROGRAM');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.programDay.deleteMany({ where: { programId: id } });
      return tx.program.update({
        where: { id },
        data: {
          name: dto.name,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          days: { create: mapDays(dto.days) },
        },
        include: EXERCISE_INCLUDE,
      });
    });
  }

  async removeOwn(id: string, memberId: string) {
    const program = await this.findOne(id);
    if (program.createdById !== memberId || program.assignedToId !== memberId) {
      throw new ForbiddenException('NOT_YOUR_PROGRAM');
    }
    await this.prisma.program.delete({ where: { id } });
  }

  /** Liste des élèves suivis par le coach — adhérents ayant un programme assigné. */
  async getStudents(coachId: string) {
    const programs = await this.prisma.program.findMany({
      where: { createdById: coachId },
      select: { assignedTo: { select: { id: true, firstName: true, lastName: true, photoKey: true } } },
      distinct: ['assignedToId'],
    });

    return programs
      .map((p) => p.assignedTo)
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }
}
