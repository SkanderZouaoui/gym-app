import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AppEvent,
  type BookingAttendedEvent,
  type BookingNoShowEvent,
  type UserRegisteredEvent,
} from '../common/events.js';

const POINTS_PER_ATTENDANCE = 10;
const POINTS_PENALTY_NO_SHOW = -5;

/** Points, badges, défis — pilotés par événements, idempotents (section 8.6/9.2/12). */
@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(AppEvent.BOOKING_ATTENDED)
  async handleAttended(payload: BookingAttendedEvent) {
    await this.awardPoints(
      payload.userId,
      POINTS_PER_ATTENDANCE,
      'CLASS_ATTENDED',
      `booking.attended:${payload.bookingId}`,
    );
    await this.updateChallengeProgress(payload.userId);
    await this.checkStreakBadges(payload.userId);
  }

  @OnEvent(AppEvent.BOOKING_NO_SHOW)
  async handleNoShow(payload: BookingNoShowEvent) {
    await this.awardPoints(
      payload.userId,
      POINTS_PENALTY_NO_SHOW,
      'NO_SHOW_PENALTY',
      `booking.no_show:${payload.bookingId}`,
    );
  }

  @OnEvent(AppEvent.USER_REGISTERED)
  async handleUserRegistered(payload: UserRegisteredEvent) {
    if (!payload.referralCode) return;
    await this.completeReferral(payload.referralCode, payload.userId);
  }

  /** Idempotent : sourceKey est une contrainte unique, un doublon est silencieusement ignoré. */
  private async awardPoints(userId: string, points: number, reason: string, sourceKey: string) {
    try {
      await this.prisma.pointsTransaction.create({ data: { userId, points, reason, sourceKey } });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.debug(`Points déjà attribués pour ${sourceKey}, ignoré`);
        return;
      }
      throw err;
    }
  }

  async getBalance(userId: string) {
    const result = await this.prisma.pointsTransaction.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    return { points: result._sum.points ?? 0 };
  }

  getHistory(userId: string) {
    return this.prisma.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Série de présence en jours consécutifs avec au moins une présence. */
  async getCurrentStreak(userId: string): Promise<number> {
    const attendances = await this.prisma.booking.findMany({
      where: { userId, status: 'ATTENDED' },
      select: { attendedAt: true },
      orderBy: { attendedAt: 'desc' },
    });
    if (attendances.length === 0) return 0;

    // Comparaison par date calendaire locale (pas ISO/UTC) pour éviter un
    // décalage de fuseau horaire entre le process serveur et les dates
    // stockées (section 12 : fenêtres et fuseaux horaires).
    const days = new Set(
      attendances.filter((a) => a.attendedAt).map((a) => this.toLocalDateKey(a.attendedAt!)),
    );

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (days.has(this.toLocalDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  private toLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getAttendanceCalendar(userId: string, from: Date, to: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId, status: 'ATTENDED', attendedAt: { gte: from, lte: to } },
      select: { attendedAt: true },
    });
    return bookings.map((b) => b.attendedAt!.toISOString().slice(0, 10));
  }

  private async checkStreakBadges(userId: string) {
    const streak = await this.getCurrentStreak(userId);
    const eligibleBadges = await this.prisma.badge.findMany({
      where: { criterionType: 'STREAK_DAYS', isActive: true, criterionValue: { lte: streak } },
    });

    for (const badge of eligibleBadges) {
      try {
        await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err; // déjà obtenu, idempotent
      }
    }
  }

  private async updateChallengeProgress(userId: string) {
    const now = new Date();
    const activeChallenges = await this.prisma.challenge.findMany({
      where: { startDate: { lte: now }, endDate: { gte: now } },
    });

    for (const challenge of activeChallenges) {
      const participation = await this.prisma.challengeParticipation.findUnique({
        where: { challengeId_userId: { challengeId: challenge.id, userId } },
      });
      if (!participation) continue; // doit avoir rejoint explicitement
      if (participation.completedAt) continue;

      const progress =
        challenge.metric === 'CLASSES_ATTENDED'
          ? await this.prisma.booking.count({
              where: {
                userId,
                status: 'ATTENDED',
                attendedAt: { gte: challenge.startDate, lte: challenge.endDate },
              },
            })
          : await this.getCurrentStreak(userId);

      const completedAt = progress >= challenge.targetValue ? now : null;

      await this.prisma.challengeParticipation.update({
        where: { id: participation.id },
        data: { progress, completedAt },
      });

      if (completedAt && challenge.pointsReward > 0) {
        await this.awardPoints(
          userId,
          challenge.pointsReward,
          'CHALLENGE_COMPLETED',
          `challenge.completed:${challenge.id}:${userId}`,
        );
      }
    }
  }

  // --- Défis ----------------------------------------------------------------

  findActiveChallenges() {
    const now = new Date();
    return this.prisma.challenge.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }

  createChallenge(data: {
    name: string;
    description?: string;
    metric: 'CLASSES_ATTENDED' | 'STREAK_DAYS';
    targetValue: number;
    startDate: string;
    endDate: string;
    pointsReward?: number;
  }) {
    return this.prisma.challenge.create({
      data: {
        name: data.name,
        description: data.description,
        metric: data.metric,
        targetValue: data.targetValue,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        pointsReward: data.pointsReward ?? 0,
      },
    });
  }

  async joinChallenge(challengeId: string, userId: string) {
    return this.prisma.challengeParticipation.upsert({
      where: { challengeId_userId: { challengeId, userId } },
      update: {},
      create: { challengeId, userId },
    });
  }

  getLeaderboard(challengeId: string) {
    return this.prisma.challengeParticipation.findMany({
      where: { challengeId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { progress: 'desc' },
      take: 20,
    });
  }

  /** Défis actifs + progression de l'utilisateur courant (null si pas encore rejoint). */
  async getMyActiveChallengesWithProgress(userId: string) {
    const challenges = await this.findActiveChallenges();
    if (challenges.length === 0) return [];

    const participations = await this.prisma.challengeParticipation.findMany({
      where: { userId, challengeId: { in: challenges.map((c) => c.id) } },
    });
    const progressByChallenge = new Map(participations.map((p) => [p.challengeId, p]));

    return challenges.map((challenge) => {
      const participation = progressByChallenge.get(challenge.id);
      return {
        ...challenge,
        myProgress: participation?.progress ?? 0,
        joined: !!participation,
        completedAt: participation?.completedAt ?? null,
      };
    });
  }

  // --- Badges -----------------------------------------------------------------

  async getUserBadges(userId: string) {
    const [allBadges, earned] = await Promise.all([
      this.prisma.badge.findMany({ where: { isActive: true }, orderBy: { criterionValue: 'asc' } }),
      this.prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true, earnedAt: true } }),
    ]);
    const earnedByBadgeId = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

    return allBadges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      iconKey: badge.iconKey,
      criterionType: badge.criterionType,
      criterionValue: badge.criterionValue,
      earned: earnedByBadgeId.has(badge.id),
      earnedAt: earnedByBadgeId.get(badge.id) ?? null,
    }));
  }

  // --- Parrainage -------------------------------------------------------------

  private static readonly REFERRAL_REWARD_POINTS = 50;
  private static readonly MAX_REFERRALS_PER_YEAR = 10;

  /** Code stable réutilisable par plusieurs filleuls — généré une seule fois
   * puis renvoyé tel quel (idempotent, contrairement à une ligne Referral
   * par invitation). */
  async createReferralCode(referrerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: referrerId }, select: { referralCode: true } });
    if (user?.referralCode) return { code: user.referralCode };

    const code = `REF-${referrerId.slice(0, 8).toUpperCase()}`;
    await this.prisma.user.update({ where: { id: referrerId }, data: { referralCode: code } });
    return { code };
  }

  /** Appelé à l'inscription si un code de parrainage est fourni — crée une
   * nouvelle ligne Referral par filleul (section Compte/Profil, limite
   * annuelle de MAX_REFERRALS_PER_YEAR par parrain). */
  async completeReferral(code: string, refereeId: string) {
    const referrer = await this.prisma.user.findUnique({ where: { referralCode: code } });
    if (!referrer || referrer.id === refereeId) return null;

    const yearStart = new Date();
    yearStart.setMonth(0, 1);
    yearStart.setHours(0, 0, 0, 0);
    const referralsThisYear = await this.prisma.referral.count({
      where: { referrerId: referrer.id, createdAt: { gte: yearStart } },
    });
    if (referralsThisYear >= LoyaltyService.MAX_REFERRALS_PER_YEAR) return null;

    const referral = await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId,
        code,
        completedAt: new Date(),
        rewardPoints: LoyaltyService.REFERRAL_REWARD_POINTS,
      },
    });

    await this.awardPoints(
      referrer.id,
      LoyaltyService.REFERRAL_REWARD_POINTS,
      'REFERRAL_COMPLETED',
      `referral.completed:${referral.id}`,
    );

    return referral;
  }

  /** Vue d'ensemble parrainage de l'adhérent : code, filleuls et statistiques
   * (section Compte/Profil, écran dédié Parrainage). */
  async getReferralOverview(referrerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: referrerId }, select: { referralCode: true } });

    const yearStart = new Date();
    yearStart.setMonth(0, 1);
    yearStart.setHours(0, 0, 0, 0);

    const [referrals, pointsEarned, referralsThisYear] = await Promise.all([
      this.prisma.referral.findMany({
        where: { referrerId },
        orderBy: { createdAt: 'desc' },
        include: { referee: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.pointsTransaction.aggregate({
        where: { userId: referrerId, reason: 'REFERRAL_COMPLETED' },
        _sum: { points: true },
      }),
      this.prisma.referral.count({ where: { referrerId, createdAt: { gte: yearStart } } }),
    ]);

    return {
      code: user?.referralCode ?? null,
      referrals,
      invitedCount: referrals.length,
      pointsEarned: pointsEarned._sum.points ?? 0,
      limitReached: referralsThisYear >= LoyaltyService.MAX_REFERRALS_PER_YEAR,
      maxReferralsPerYear: LoyaltyService.MAX_REFERRALS_PER_YEAR,
    };
  }
}
