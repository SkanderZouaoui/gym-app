import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateHomeAlertDto, UpdateHomeAlertDto } from './dto/home-alert.dto.js';

/** Alertes de l'accueil adhérent : gérées par l'admin, filtrées par période et audience côté adhérent. */
@Injectable()
export class HomeAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.homeAlert.findMany({ orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }] });
  }

  create(dto: CreateHomeAlertDto) {
    return this.prisma.homeAlert.create({
      data: {
        title: dto.title,
        message: dto.message,
        level: dto.level ?? 'info',
        audience: dto.audience ?? 'Tous',
        startsOn: new Date(dto.startsOn),
        endsOn: new Date(dto.endsOn),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateHomeAlertDto) {
    await this.find(id);
    return this.prisma.homeAlert.update({
      where: { id },
      data: {
        ...dto,
        startsOn: dto.startsOn ? new Date(dto.startsOn) : undefined,
        endsOn: dto.endsOn ? new Date(dto.endsOn) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.find(id);
    await this.prisma.homeAlert.delete({ where: { id } });
    return { ok: true };
  }

  private async find(id: string) {
    const alert = await this.prisma.homeAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('HOME_ALERT_NOT_FOUND');
    return alert;
  }

  /** Alertes à afficher aujourd'hui à cet adhérent (actives, dans leur période, audience adaptée à son abonnement). */
  async findForMember(userId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [alerts, memberships] = await Promise.all([
      this.prisma.homeAlert.findMany({
        where: { isActive: true, startsOn: { lte: today }, endsOn: { gte: today } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.membership.findMany({ where: { userId }, select: { status: true } }),
    ]);
    const hasActive = memberships.some((m) => m.status === 'ACTIVE');
    const expired = !hasActive && memberships.some((m) => m.status === 'EXPIRED');
    return alerts.filter((a) => a.audience === 'Tous' || (a.audience === 'Actifs' && hasActive) || (a.audience === 'Expirés' && expired));
  }
}
