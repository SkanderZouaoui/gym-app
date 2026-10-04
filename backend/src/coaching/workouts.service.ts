import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWorkoutLogDto } from './dto/create-workout-log.dto.js';

/** Journal de séances de l'adhérent (section 4.1/8.5). */
@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateWorkoutLogDto) {
    return this.prisma.workoutLog.create({
      data: {
        userId,
        feeling: dto.feeling,
        sets: {
          create: dto.sets.map((s) => ({
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            weightKg: s.weightKg,
            reps: s.reps,
            rpe: s.rpe,
          })),
        },
      },
      include: { sets: { include: { exercise: true } } },
    });
  }

  findForUser(userId: string) {
    return this.prisma.workoutLog.findMany({
      where: { userId },
      include: { sets: { include: { exercise: true } } },
      orderBy: { date: 'desc' },
    });
  }

  /** Suivi de la progression d'un élève par le coach — nécessite le consentement (section 4.2/13). */
  findForMemberByCoach(memberId: string) {
    return this.prisma.workoutLog.findMany({
      where: { userId: memberId },
      include: { sets: { include: { exercise: true } } },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }
}
