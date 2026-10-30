import { Injectable } from '@nestjs/common';
import { mergeConfig } from '../organization/organization-config.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Éléments de configuration manquants ou incomplets, à traiter par l'admin.
   * `route` = écran mobile où corriger (chemin expo-router).
   */
  async setupAlerts() {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
    const [settings, teamUsers, withShifts, plans, rooms, types, upcoming, noCoach, staffCount] = await Promise.all([
      this.prisma.organizationSettings.findFirst({ select: { config: true } }),
      this.prisma.user.findMany({
        where: { deletedAt: null, status: 'ACTIVE', roles: { some: { role: { in: ['STAFF', 'COACH'] } } } },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.workShift.findMany({ distinct: ['userId'], select: { userId: true } }),
      this.prisma.membershipPlan.count({ where: { isActive: true } }),
      this.prisma.room.count(),
      this.prisma.classType.count({ where: { isActive: true } }),
      this.prisma.classSession.count({ where: { status: { not: 'CANCELLED' }, startsAt: { gt: now, lte: weekEnd } } }),
      this.prisma.classSession.count({ where: { status: { not: 'CANCELLED' }, coachId: null, startsAt: { gt: now, lte: weekEnd } } }),
      this.prisma.user.count({ where: { deletedAt: null, status: 'ACTIVE', roles: { some: { role: 'STAFF' } } } }),
    ]);

    const config = mergeConfig(settings?.config);
    const configured = !!settings && Object.keys((settings.config ?? {}) as object).length > 0;
    const scheduled = new Set(withShifts.map((w) => w.userId));
    const missingShift = teamUsers.filter((u) => !scheduled.has(u.id));

    const alerts: { key: string; severity: 'warning' | 'danger' | 'info'; title: string; detail: string; route: string; params?: Record<string, string | number> }[] = [];
    if (staffCount === 0) {
      alerts.push({ key: 'no-staff', severity: 'danger', title: 'Aucun compte d’accueil', detail: 'Créez au moins un compte d’accueil pour encaisser et pointer.', route: '/(admin)/team' });
    }
    if (missingShift.length > 0) {
      alerts.push({
        key: 'missing-shifts',
        severity: 'warning',
        title: `${missingShift.length} membre${missingShift.length > 1 ? 's' : ''} de l’équipe sans planning`,
        detail: missingShift.slice(0, 3).map((u) => `${u.firstName} ${u.lastName}`).join(', ') + (missingShift.length > 3 ? '…' : ''),
        route: '/(admin)/team',
        params: { count: missingShift.length, names: missingShift.slice(0, 3).map((u) => `${u.firstName} ${u.lastName}`).join(', ') + (missingShift.length > 3 ? '…' : '') },
      });
    }
    if (plans === 0) {
      alerts.push({ key: 'no-plans', severity: 'danger', title: 'Aucun forfait actif', detail: 'Sans forfait, impossible de créer un abonnement.', route: '/(admin)/plans' });
    }
    if (types === 0) {
      alerts.push({ key: 'no-types', severity: 'danger', title: 'Aucun type de cours', detail: 'Ajoutez les types de cours dans la configuration.', route: '/(admin)/settings' });
    }
    if (rooms === 0) {
      alerts.push({ key: 'no-rooms', severity: 'warning', title: 'Aucune salle définie', detail: 'Ajoutez vos salles dans la configuration.', route: '/(admin)/settings' });
    }
    if (!configured) {
      alerts.push({ key: 'config-never-saved', severity: 'warning', title: 'Configuration de la salle non enregistrée', detail: 'Horaires, moyens de paiement et règles de réservation utilisent les valeurs par défaut.', route: '/(admin)/settings' });
    }
    if (!config.contact.address.trim() || !config.contact.phone.trim() || !config.contact.email.trim()) {
      alerts.push({ key: 'contact-missing', severity: 'info', title: 'Coordonnées de la salle incomplètes', detail: 'Adresse, téléphone ou e-mail manquant.', route: '/(admin)/settings' });
    }
    if (config.hours.every((h) => !h.open)) {
      alerts.push({ key: 'hours-closed', severity: 'warning', title: 'Aucun jour d’ouverture', detail: 'Les horaires indiquent la salle fermée toute la semaine.', route: '/(admin)/settings' });
    }
    if (upcoming === 0) {
      alerts.push({ key: 'no-sessions', severity: 'warning', title: 'Aucun cours programmé cette semaine', detail: 'Les adhérents ne peuvent rien réserver.', route: '/(admin)/(tabs)/planning' });
    } else if (noCoach > 0) {
      alerts.push({ key: 'sessions-no-coach', severity: 'warning', title: `${noCoach} cours sans coach cette semaine`, detail: 'Affectez un coach depuis le planning.', route: '/(admin)/(tabs)/planning', params: { count: noCoach } });
    }
    return alerts;
  }

  /** Tableau de bord mobile/back-office (section 4.4/4.5). */
  async dashboard() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [activeMembers, attendanceToday, revenueToday, revenueMonth, todaySessions] =
      await Promise.all([
        this.prisma.membership.count({
          where: {
            status: 'ACTIVE',
            endDate: { gte: new Date() },
          },
        }),
        this.prisma.booking.count({
          where: {
            status: 'ATTENDED',
            attendedAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        this.prisma.payment.aggregate({
          where: { recordedAt: { gte: startOfDay, lte: endOfDay }, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: { recordedAt: { gte: startOfMonth }, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.classSession.findMany({
          where: { startsAt: { gte: startOfDay, lte: endOfDay }, status: { not: 'CANCELLED' } },
          include: { _count: { select: { bookings: { where: { status: { in: ['CONFIRMED', 'ATTENDED'] } } } } } },
        }),
      ]);

    const avgFillRate =
      todaySessions.length > 0
        ? Math.round(
            todaySessions.reduce(
              (sum, s) => sum + (s.capacity > 0 ? s._count.bookings / s.capacity : 0),
              0,
            ) / todaySessions.length * 100,
          )
        : 0;

    return {
      activeMembers,
      attendanceToday,
      revenueToday: revenueToday._sum.amount ?? 0,
      revenueMonth: revenueMonth._sum.amount ?? 0,
      classesToday: todaySessions.length,
      avgFillRate,
      alerts: await this.getAlerts(),
    };
  }

  /** Alertes : abonnements qui expirent, cours sous-remplis, no-show anormal (section 4.4). */
  private async getAlerts() {
    const in7Days = new Date(Date.now() + 7 * 86_400_000);

    const expiringMemberships = await this.prisma.membership.count({
      where: {
        status: 'ACTIVE',
        endDate: { gte: new Date(), lte: in7Days },
      },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const in3Days = new Date(Date.now() + 3 * 86_400_000);

    const underfilledSessions = await this.prisma.classSession.findMany({
      where: {
        startsAt: { gte: startOfDay, lte: in3Days },
        status: 'SCHEDULED',
      },
      include: { _count: { select: { bookings: { where: { status: 'CONFIRMED' } } } }, classType: true },
    });
    const underfilled = underfilledSessions.filter(
      (s) => s.capacity > 0 && s._count.bookings / s.capacity < 0.3,
    );

    return {
      expiringMemberships,
      underfilledClasses: underfilled.length,
    };
  }

  async expiringMemberships() {
    const in7Days = new Date(Date.now() + 7 * 86_400_000);
    return this.prisma.membership.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: new Date(), lte: in7Days },
      },
      include: { user: { select: { firstName: true, lastName: true, phone: true } }, plan: true },
      orderBy: { endDate: 'asc' },
    });
  }
}
