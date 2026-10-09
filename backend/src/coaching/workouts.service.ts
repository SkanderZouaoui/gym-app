import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWorkoutLogDto } from './dto/create-workout-log.dto.js';

/** Journal de séances de l'adhérent (section 4.1/8.5). */
@Injectable()
export class WorkoutsService {
  private readonly logger = new Logger(WorkoutsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorkoutLogDto) {
    // Records précédents par exercice, capturés AVANT insertion du nouveau
    // log — sert à détecter un dépassement une fois les nouveaux sets écrits.
    const exerciseIds = [...new Set(dto.sets.map((s) => s.exerciseId))];
    const previousBests = await this.getPreviousBests(userId, exerciseIds);

    const log = await this.prisma.workoutLog.create({
      data: {
        userId,
        programId: dto.programId,
        dayId: dto.dayId,
        feeling: dto.feeling,
        durationMinutes: dto.durationMinutes,
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
      include: { sets: { include: { exercise: true } }, program: true, day: true },
    });

    await this.detectAndNotifyPersonalRecords(userId, log.sets, previousBests);

    return log;
  }

  /** Meilleur poids déjà loggé par exercice, avant le nouveau passage (undefined = jamais loggé). */
  private async getPreviousBests(userId: string, exerciseIds: string[]): Promise<Map<string, number>> {
    if (exerciseIds.length === 0) return new Map();

    const grouped = await this.prisma.workoutSet.groupBy({
      by: ['exerciseId'],
      where: { workoutLog: { userId }, exerciseId: { in: exerciseIds }, weightKg: { not: null } },
      _max: { weightKg: true },
    });

    return new Map(
      grouped
        .filter((g) => g._max.weightKg !== null)
        .map((g) => [g.exerciseId, Number(g._max.weightKg)]),
    );
  }

  /**
   * Notifie l'adhérent + ses coachs quand un set dépasse son record de poids
   * précédent sur un exercice. Pas de notification au tout premier passage
   * (pas de record précédent à battre) pour éviter le bruit.
   */
  private async detectAndNotifyPersonalRecords(
    userId: string,
    sets: { exerciseId: string; weightKg: unknown; exercise: { name: string } }[],
    previousBests: Map<string, number>,
  ) {
    const beaten = new Map<string, { weightKg: number; exerciseName: string }>();
    for (const set of sets) {
      if (set.weightKg == null) continue;
      const weightKg = Number(set.weightKg);
      const previousBest = previousBests.get(set.exerciseId);
      if (previousBest === undefined || weightKg <= previousBest) continue;
      const current = beaten.get(set.exerciseId);
      if (!current || weightKg > current.weightKg) {
        beaten.set(set.exerciseId, { weightKg, exerciseName: set.exercise.name });
      }
    }
    if (beaten.size === 0) return;

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!member) return;

    const coachIds = await this.getActiveCoachIds(userId);

    for (const { weightKg, exerciseName } of beaten.values()) {
      const title = 'Nouveau record personnel';
      const memberBody = `Vous avez battu votre record sur ${exerciseName} : ${weightKg} kg.`;
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'PERSONAL_RECORD',
          title,
          body: memberBody,
          data: { exerciseName, weightKg },
        },
      });

      if (coachIds.length > 0) {
        const coachBody = `${member.firstName} ${member.lastName} a battu son record sur ${exerciseName} : ${weightKg} kg.`;
        await this.prisma.notification.createMany({
          data: coachIds.map((coachId) => ({
            userId: coachId,
            type: 'PERSONAL_RECORD' as const,
            title,
            body: coachBody,
            data: { exerciseName, weightKg, memberId: userId },
          })),
        });
      }
    }

    this.logger.debug(`${beaten.size} record(s) personnel(s) détecté(s) pour ${userId}`);
  }

  /** Coachs ayant eu au moins une séance individuelle confirmée/terminée avec cet élève. */
  private async getActiveCoachIds(memberId: string): Promise<string[]> {
    const sessions = await this.prisma.coachingSession.findMany({
      where: { memberId, status: { in: ['CONFIRMED', 'COMPLETED'] } },
      select: { coachId: true },
      distinct: ['coachId'],
    });
    return sessions.map((s) => s.coachId);
  }

  findForUser(userId: string) {
    return this.prisma.workoutLog.findMany({
      where: { userId },
      include: { sets: { include: { exercise: true } }, program: true, day: true },
      orderBy: { date: 'desc' },
    });
  }

  /** Suivi de la progression d'un élève par le coach — nécessite le consentement (section 4.2/13). */
  findForMemberByCoach(memberId: string) {
    return this.prisma.workoutLog.findMany({
      where: { userId: memberId },
      include: { sets: { include: { exercise: true } }, program: true, day: true },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }
}
