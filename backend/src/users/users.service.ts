import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
import { notifyAdmins } from '../notifications/admin-notify.js';
import { readOrganizationConfig } from '../organization/organization-config.js';
import { generateMemberCode } from './member-code.js';
import * as argon2 from 'argon2';
import type { Prisma } from '@prisma/client';
import { Role } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { OtpService } from '../otp/otp.service.js';
import type { CreatePrivilegedUserDto } from './dto/create-privileged-user.dto.js';
import type { CreateMemberDto } from './dto/create-member.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';
import type { AssignRoleDto } from './dto/assign-role.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { RequestEmailChangeDto } from './dto/request-email-change.dto.js';

const PUBLIC_USER_SELECT = {
  id: true,
  memberCode: true,
  mustChangePassword: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  photoKey: true,
  status: true,
  consents: true,
  onboardedAt: true,
  fitnessProfile: true,
  createdAt: true,
  roles: { select: { role: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly otpService: OtpService,
  ) {}

  private async withPhotoUrl<T extends { photoKey: string | null }>(user: T) {
    return { ...user, photoUrl: user.photoKey ? await this.storageService.getReadUrl(user.photoKey) : null };
  }

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    // Comptes créés sans code (autres chemins de création) : le code est attribué au premier accès.
    if (!user.memberCode) user.memberCode = await this.assignMemberCode(userId);
    const coach = await this.prisma.coachProfile.findUnique({ where: { userId }, select: { specialties: true } });
    return { ...(await this.withPhotoUrl(user)), specialties: coach?.specialties ?? [] };
  }

  /** Enregistre l'objectif et le profil physique de l'adhérent (onboarding) et sa première mesure de poids. */
  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const { weightKg, ...profile } = dto;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { fitnessProfile: profile, onboardedAt: new Date() } }),
      this.prisma.bodyMetric.create({ data: { userId, weightKg } }),
    ]);
    return this.findMe(userId);
  }

  /** Modifie l'objectif de séances par semaine (profil physique conservé). */
  async updateWeeklyGoal(userId: string, sessionsPerWeek: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fitnessProfile: true } });
    const profile = (user?.fitnessProfile ?? {}) as Record<string, unknown>;
    await this.prisma.user.update({ where: { id: userId }, data: { fitnessProfile: { ...profile, sessionsPerWeek } } });
    return this.findMe(userId);
  }

  /** Attribue un code à 6 chiffres unique à un compte qui n'en a pas encore. */
  private async assignMemberCode(userId: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = String(100000 + Math.floor(Math.random() * 900000));
      try {
        await this.prisma.user.update({ where: { id: userId }, data: { memberCode: code } });
        return code;
      } catch {
        // collision (très improbable) : on retente avec un autre code
      }
    }
    throw new Error('MEMBER_CODE_GENERATION_FAILED');
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    this.storageService.assertOwnKey(dto.photoKey, `avatars/${userId}`);
    if (dto.phone) {
      const taken = await this.prisma.user.findFirst({ where: { phone: dto.phone, id: { not: userId } }, select: { id: true } });
      if (taken) throw new ConflictException('PHONE_ALREADY_USED');
    }
    const previous =
      dto.photoKey !== undefined
        ? await this.prisma.user.findUnique({ where: { id: userId }, select: { photoKey: true } })
        : null;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto as Prisma.UserUpdateInput,
      select: PUBLIC_USER_SELECT,
    });

    if (previous?.photoKey && previous.photoKey !== dto.photoKey) {
      await this.storageService.deleteObject(previous.photoKey).catch(() => {});
    }

    return this.withPhotoUrl(user);
  }

  /** URL présignée pour que le téléphone envoie directement sa nouvelle photo
   * de profil vers le stockage objet — même mécanisme que les photos de
   * progression (section body-metrics), clé confirmée via `PATCH /v1/me`. */
  async requestAvatarUploadUrl(userId: string, contentType: string, sizeBytes: number) {
    const key = this.storageService.buildKey(`avatars/${userId}`, contentType);
    const uploadUrl = await this.storageService.getUploadUrl(key, contentType, sizeBytes);
    return { key, uploadUrl };
  }

  /** Suppression de compte en libre-service (section Compte/Profil) — soft delete,
   * distinct de la suspension/réactivation réservées aux admins. */
  async deleteOwnAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) throw new UnauthorizedException('INVALID_PASSWORD');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'DELETED', deletedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: { actorId: userId, action: 'SELF_DELETE_ACCOUNT', entity: 'User', entityId: userId },
      }),
    ]);
  }

  /** Étape 1 du changement d'e-mail — vérifie le mot de passe actuel puis
   * envoie un OTP à la nouvelle adresse (section Compte/Profil). */
  async requestEmailChange(userId: string, dto: RequestEmailChangeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) throw new UnauthorizedException('INVALID_PASSWORD');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.newEmail } });
    if (existing) throw new ConflictException('EMAIL_ALREADY_USED');

    await this.otpService.generateAndStore(userId, 'EMAIL_CHANGE', dto.newEmail, dto.lang);
  }

  /** Étape 2 — vérifie le code et applique le nouvel e-mail stagé sur l'OTP. */
  async confirmEmailChange(userId: string, code: string) {
    const otp = await this.otpService.verify(userId, 'EMAIL_CHANGE', code);
    if (!otp.newEmail) throw new UnauthorizedException('OTP_INVALID');

    const existing = await this.prisma.user.findUnique({ where: { email: otp.newEmail } });
    if (existing && existing.id !== userId) throw new ConflictException('EMAIL_ALREADY_USED');

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { email: otp.newEmail }, select: PUBLIC_USER_SELECT }),
      this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
      this.prisma.auditLog.create({
        data: { actorId: userId, action: 'SELF_CHANGE_EMAIL', entity: 'User', entityId: userId },
      }),
    ]);

    return this.withPhotoUrl(user);
  }

  /** Changement de mot de passe en libre-service (section Compte/Profil —
   * Confidentialité) — utilisateur déjà authentifié, pas d'OTP nécessaire,
   * juste le mot de passe actuel comme confirmation. Contrairement à la
   * suppression de compte ou la réinitialisation oubliée, les sessions en
   * cours ne sont pas révoquées : l'utilisateur vient de prouver son
   * identité avec le mot de passe actuel, pas besoin de le déconnecter. */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const passwordValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!passwordValid) throw new UnauthorizedException('INVALID_PASSWORD');

    if (currentPassword === newPassword) throw new BadRequestException('PASSWORD_UNCHANGED');

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } }),
      this.prisma.auditLog.create({
        data: { actorId: userId, action: 'SELF_CHANGE_PASSWORD', entity: 'User', entityId: userId },
      }),
    ]);
  }

  /** Recherche d'adhérent par nom ou téléphone (section 4.3 — Staff). */
  async search(query: string) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        // Liste des adhérents : ni l'équipe d'accueil ni les admins (comptes gérés dans « Équipe »).
        roles: { some: { role: Role.MEMBER }, none: { role: { in: [Role.STAFF, Role.ADMIN] } } },
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
          { memberCode: query },
        ],
      },
      select: {
        ...PUBLIC_USER_SELECT,
        // Dernier abonnement : permet à l'accueil de filtrer et d'afficher la formule dans la liste.
        memberships: {
          orderBy: { endDate: 'desc' },
          take: 1,
          select: { status: true, endDate: true, plan: { select: { name: true } } },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 100,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return user;
  }

  /** Création d'un adhérent par un admin/staff. Avec `planId`, le compte, l'abonnement et
   * l'encaissement sont créés dans une seule transaction : tout ou rien. */
  async createMember(dto: CreateMemberDto, actorId: string, actorRole?: Role) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, dto.phone ? { phone: dto.phone } : undefined].filter(Boolean) as any },
      select: { email: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.email?.toLowerCase() === dto.email.toLowerCase() ? 'EMAIL_ALREADY_USED' : 'PHONE_ALREADY_USED',
      );
    }

    if (dto.planId && dto.paymentMethod) {
      const config = await readOrganizationConfig(this.prisma);
      if (!config.paymentMethods[dto.paymentMethod]) throw new BadRequestException('PAYMENT_METHOD_DISABLED');
    }

    const plan = dto.planId ? await this.prisma.membershipPlan.findUnique({ where: { id: dto.planId } }) : null;
    if (dto.planId && !plan) throw new NotFoundException('PLAN_NOT_FOUND');
    if (plan && actorRole === Role.STAFF) {
      const settings = await this.prisma.organizationSettings.findFirst();
      const policy = (settings?.attendancePolicy ?? {}) as { staffCanRecordPayments?: boolean };
      if (policy.staffCanRecordPayments === false) throw new ForbiddenException('STAFF_PAYMENTS_DISABLED');
    }

    const passwordHash = await argon2.hash(dto.password);
    const memberCode = await generateMemberCode(this.prisma);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          memberCode,
          mustChangePassword: true,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roles: { create: { role: Role.MEMBER } },
        },
        select: PUBLIC_USER_SELECT,
      });
      await tx.auditLog.create({ data: { actorId, action: 'CREATE_MEMBER', entity: 'User', entityId: user.id } });

      if (!plan || !dto.paymentMethod) return { ...user, membership: null, payment: null };

      const startDate = new Date();
      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          planId: plan.id,
          startDate,
          endDate: new Date(startDate.getTime() + plan.durationDays * 86_400_000),
          status: 'ACTIVE',
        },
      });
      await tx.auditLog.create({
        data: { actorId, action: 'CREATE_MEMBERSHIP', entity: 'Membership', entityId: membership.id, newValue: { userId: user.id, planId: plan.id } },
      });
      const amount = Math.round(Number(plan.price));
      const payment = await tx.payment.create({
        data: { membershipId: membership.id, amount, method: dto.paymentMethod, recordedById: actorId },
      });
      await tx.auditLog.create({
        data: { actorId, action: 'RECORD_PAYMENT', entity: 'Payment', entityId: payment.id, newValue: { amount, method: dto.paymentMethod, membershipId: membership.id } },
      });
      return { ...user, membership, payment };
    });

    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { firstName: true, lastName: true } });
    const actorName = actor ? `${actor.firstName} ${actor.lastName}` : '—';
    const memberName = `${dto.firstName} ${dto.lastName}`;
    await notifyAdmins(this.prisma, actorId, { kind: 'new_member', memberName, actorName });
    if (result.payment) {
      await notifyAdmins(this.prisma, actorId, {
        kind: 'payment',
        amount: Number(result.payment.amount),
        method: String(dto.paymentMethod),
        memberName,
        actorName,
      });
    }
    return result;
  }

  /** Édition d'un adhérent par un admin/staff — contrairement à updateProfile
   * (libre-service), permet aussi de changer l'e-mail et le statut. */
  async updateMember(id: string, dto: UpdateMemberDto, actorId: string) {
    const before = await this.findOne(id);

    if (dto.email && dto.email !== before.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('EMAIL_ALREADY_USED');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: PUBLIC_USER_SELECT,
    });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'UPDATE_MEMBER', entity: 'User', entityId: id, oldValue: before as any, newValue: dto as any },
    });

    return user;
  }

  /** Suppression d'un adhérent par un admin/staff — soft delete, même
   * mécanisme que la suppression en libre-service mais sans mot de passe
   * de confirmation (l'admin a déjà l'autorité nécessaire). */
  async deleteMember(id: string, actorId: string) {
    if (id === actorId) throw new BadRequestException('CANNOT_DELETE_SELF');
    await this.findOne(id);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { status: 'DELETED', deletedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: { actorId, action: 'ADMIN_DELETE_MEMBER', entity: 'User', entityId: id },
      }),
    ]);
  }

  async suspend(id: string, actorId: string) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: PUBLIC_USER_SELECT,
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'SUSPEND_USER', entity: 'User', entityId: id },
    });
    return user;
  }

  async reactivate(id: string, actorId: string) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: PUBLIC_USER_SELECT,
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'REACTIVATE_USER', entity: 'User', entityId: id },
    });
    return user;
  }

  /** Comptes internes (Staff + Admin) — back-office → Équipe. */
  findAllTeam() {
    return this.prisma.user.findMany({
      where: { deletedAt: null, roles: { some: { role: { in: [Role.STAFF, Role.COACH, Role.ADMIN] } } } },
      select: PUBLIC_USER_SELECT,
      orderBy: { firstName: 'asc' },
    });
  }

  /**
   * Réinitialisation du mot de passe par un admin (équipe ou adhérent) ou par l'accueil (adhérents uniquement) :
   * un mot de passe provisoire aléatoire est généré, affiché une seule fois, et le changement est exigé à la prochaine connexion.
   */
  async resetPassword(targetId: string, actorId: string, actorRoles: Role[]) {
    if (targetId === actorId) throw new BadRequestException('CANNOT_RESET_SELF');
    const target = await this.prisma.user.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true, roles: { select: { role: true } } } });
    if (!target) throw new NotFoundException('USER_NOT_FOUND');

    const isAdmin = actorRoles.includes(Role.ADMIN);
    const targetIsPrivileged = target.roles.some((r) => r.role !== Role.MEMBER);
    // L'accueil ne peut réinitialiser que des adhérents, pas le personnel ni les admins.
    if (!isAdmin && targetIsPrivileged) throw new ForbiddenException('RESET_NOT_ALLOWED');

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(10);
    const password = Array.from(bytes, (b) => chars[b % chars.length]).join('');
    const passwordHash = await argon2.hash(password);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: targetId }, data: { passwordHash, mustChangePassword: true } }),
      this.prisma.refreshToken.updateMany({ where: { userId: targetId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.auditLog.create({ data: { actorId, action: 'ADMIN_RESET_PASSWORD', entity: 'User', entityId: targetId } }),
    ]);
    return { password };
  }

  /** Équipe en poste aujourd'hui, d'après le planning de travail (lundi = 0). */
  async teamOnShift() {
    const dow = (new Date().getDay() + 6) % 7;
    const shifts = await this.prisma.workShift.findMany({
      where: { dayOfWeek: dow, user: { deletedAt: null, status: 'ACTIVE' } },
      include: { user: { select: { id: true, firstName: true, lastName: true, roles: { select: { role: true } } } } },
      orderBy: { startTime: 'asc' },
    });
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return shifts.map((sh) => ({
      id: sh.user.id,
      firstName: sh.user.firstName,
      lastName: sh.user.lastName,
      role: sh.user.roles.some((r) => r.role === 'COACH') ? 'COACH' : 'STAFF',
      startTime: sh.startTime,
      endTime: sh.endTime,
      /** Le créneau est en cours à cet instant. */
      onDutyNow: sh.startTime <= hhmm && hhmm < sh.endTime,
    }));
  }

  // --- Planning de travail ---------------------------------------------------

  async getSchedule(userId: string) {
    const rows = await this.prisma.workShift.findMany({ where: { userId }, orderBy: { dayOfWeek: 'asc' } });
    return Array.from({ length: 7 }, (_, d) => {
      const r = rows.find((x) => x.dayOfWeek === d);
      return { dayOfWeek: d, working: !!r, startTime: r?.startTime ?? '09:00', endTime: r?.endTime ?? '17:00' };
    });
  }

  /** Remplace le planning hebdomadaire : seuls les jours travaillés sont conservés. */
  async setSchedule(userId: string, days: { dayOfWeek: number; working: boolean; startTime: string; endTime: string }[], actorId: string) {
    await this.findOne(userId);
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const d of days) {
      if (d.dayOfWeek < 0 || d.dayOfWeek > 6 || !hhmm.test(d.startTime) || !hhmm.test(d.endTime)) throw new BadRequestException('INVALID_SCHEDULE');
      if (d.working && d.endTime <= d.startTime) throw new BadRequestException('SHIFT_END_BEFORE_START');
    }
    await this.prisma.$transaction([
      this.prisma.workShift.deleteMany({ where: { userId } }),
      this.prisma.workShift.createMany({
        data: days.filter((d) => d.working).map((d) => ({ userId, dayOfWeek: d.dayOfWeek, startTime: d.startTime, endTime: d.endTime })),
      }),
      this.prisma.auditLog.create({ data: { actorId, action: 'SET_WORK_SCHEDULE', entity: 'User', entityId: userId, newValue: days as object } }),
    ]);
    return this.getSchedule(userId);
  }

  /** Jours et heures prévus par le planning entre `from` et maintenant (la semaine type est répétée). */
  private plannedWorkload(shifts: { dayOfWeek: number; startTime: string; endTime: string }[], from: Date, to: Date) {
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    let days = 0;
    let minutes = 0;
    for (let d = new Date(from.getFullYear(), from.getMonth(), from.getDate()); d <= to; d.setDate(d.getDate() + 1)) {
      const dow = (d.getDay() + 6) % 7;
      const shift = shifts.find((x) => x.dayOfWeek === dow);
      if (!shift) continue;
      days += 1;
      minutes += toMin(shift.endTime) - toMin(shift.startTime);
    }
    return { days, hours: Math.round((minutes / 60) * 10) / 10 };
  }

  /** Activité d'un membre de l'équipe sur une période : accueil (scans, encaissements, comptes créés) et coach (cours assurés). */
  async getTeamStats(id: string, days: number) {
    const user = await this.findOne(id);
    const roles = user.roles.map((r) => r.role as string);
    const now = new Date();
    const from = new Date(now.getTime() - days * 86_400_000);
    const dayKey = (d: Date) => d.toLocaleDateString('sv-SE');

    /** Jours travaillés + heures : durée entre la première et la dernière activité de chaque jour. */
    const workload = (stamps: Date[]) => {
      const byDay = new Map<string, { first: number; last: number }>();
      for (const t of stamps) {
        const k = dayKey(t);
        const cur = byDay.get(k);
        const ms = t.getTime();
        byDay.set(k, cur ? { first: Math.min(cur.first, ms), last: Math.max(cur.last, ms) } : { first: ms, last: ms });
      }
      const daysWorked = byDay.size;
      const hours = [...byDay.values()].reduce((sum, d) => sum + (d.last - d.first) / 3_600_000, 0);
      return { daysWorked, hours: Math.round(hours * 10) / 10, avgHoursPerDay: daysWorked ? Math.round((hours / daysWorked) * 10) / 10 : 0 };
    };

    let staff: Record<string, unknown> | null = null;
    if (roles.includes('STAFF') || roles.includes('ADMIN')) {
      const [scans, payments, created, audits, logins] = await Promise.all([
        this.prisma.attendanceScanLog.findMany({ where: { scannedBy: id, scannedAt: { gte: from } }, select: { scannedAt: true, result: true } }),
        this.prisma.payment.findMany({ where: { recordedById: id, deletedAt: null, recordedAt: { gte: from } }, select: { recordedAt: true, amount: true } }),
        this.prisma.auditLog.count({ where: { actorId: id, action: 'CREATE_MEMBER', createdAt: { gte: from } } }),
        this.prisma.auditLog.findMany({ where: { actorId: id, createdAt: { gte: from } }, select: { createdAt: true } }),
        this.prisma.refreshToken.findMany({ where: { userId: id, createdAt: { gte: from } }, select: { createdAt: true } }),
      ]);
      const shifts = await this.prisma.workShift.findMany({ where: { userId: id } });
      const planned = shifts.length ? this.plannedWorkload(shifts, from, now) : null;
      const activity = workload([...scans.map((s) => s.scannedAt), ...payments.map((p) => p.recordedAt), ...audits.map((a) => a.createdAt), ...logins.map((l) => l.createdAt)]);
      staff = {
        scans: scans.length,
        scansGranted: scans.filter((s) => s.result === 'GRANTED').length,
        payments: payments.length,
        paymentsTotal: payments.reduce((sum, p) => sum + Number(p.amount), 0),
        accountsCreated: created,
        // Planning défini : jours et heures prévus ; sinon estimation d'après l'activité.
        daysWorked: planned ? planned.days : activity.daysWorked,
        hours: planned ? planned.hours : activity.hours,
        avgHoursPerDay: planned ? (planned.days ? Math.round((planned.hours / planned.days) * 10) / 10 : 0) : activity.avgHoursPerDay,
        activeDays: activity.daysWorked,
        source: planned ? 'planning' : 'activity',
        estimated: !planned,
      };
    }

    let coach: Record<string, unknown> | null = null;
    if (roles.includes('COACH')) {
      const [done, upcoming] = await Promise.all([
        this.prisma.classSession.findMany({
          where: { coachId: id, status: { not: 'CANCELLED' }, endsAt: { gte: from, lte: now } },
          select: { id: true, startsAt: true, endsAt: true },
        }),
        this.prisma.classSession.count({ where: { coachId: id, status: { not: 'CANCELLED' }, startsAt: { gt: now } } }),
      ]);
      const attended = await this.prisma.booking.count({ where: { sessionId: { in: done.map((d) => d.id) }, status: 'ATTENDED' } });
      const hours = done.reduce((sum, d) => sum + (d.endsAt.getTime() - d.startsAt.getTime()) / 3_600_000, 0);
      const daysWorked = new Set(done.map((d) => dayKey(d.startsAt))).size;
      const coachShifts = await this.prisma.workShift.findMany({ where: { userId: id } });
      const coachPlanned = coachShifts.length ? this.plannedWorkload(coachShifts, from, now) : null;
      coach = {
        plannedDays: coachPlanned?.days ?? null,
        plannedHours: coachPlanned?.hours ?? null,
        sessions: done.length,
        attendees: attended,
        upcoming,
        daysWorked,
        hours: Math.round(hours * 10) / 10,
        avgHoursPerDay: daysWorked ? Math.round((hours / daysWorked) * 10) / 10 : 0,
        estimated: false,
      };
    }

    return { days, staff: roles.includes('COACH') && !roles.includes('STAFF') ? null : staff, coach };
  }

  async updateTeamMember(id: string, dto: UpdateMemberDto, actorId: string) {
    const before = await this.findOne(id);

    if (dto.email && dto.email !== before.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('EMAIL_ALREADY_USED');
    }

    const user = await this.prisma.user.update({ where: { id }, data: dto, select: PUBLIC_USER_SELECT });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'UPDATE_TEAM_MEMBER', entity: 'User', entityId: id, oldValue: before as any, newValue: dto as any },
    });

    return user;
  }

  /** Créé par un admin uniquement — pas d'auto-inscription (section 13). */
  async createPrivilegedUser(dto: CreatePrivilegedUserDto, actorId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, dto.phone ? { phone: dto.phone } : undefined].filter(Boolean) as any },
      select: { email: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.email?.toLowerCase() === dto.email.toLowerCase() ? 'EMAIL_ALREADY_USED' : 'PHONE_ALREADY_USED',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        memberCode: await generateMemberCode(this.prisma),
        mustChangePassword: true,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: { create: { role: dto.role } },
        ...(dto.role === Role.COACH ? { coachProfile: { create: {} } } : {}),
      },
      select: PUBLIC_USER_SELECT,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'CREATE_PRIVILEGED_USER',
        entity: 'User',
        entityId: user.id,
        newValue: { role: dto.role },
      },
    });

    return user;
  }

  async assignRole(userId: string, dto: AssignRoleDto, actorId: string) {
    await this.findOne(userId);

    const grant = await this.prisma.userRole.upsert({
      where: {
        userId_role: { userId, role: dto.role },
      },
      update: {},
      create: { userId, role: dto.role },
    });

    if (dto.role === Role.COACH) {
      await this.prisma.coachProfile.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'ASSIGN_ROLE',
        entity: 'User',
        entityId: userId,
        newValue: { role: dto.role },
      },
    });

    return grant;
  }

  async revokeRole(userId: string, role: Role, actorId: string) {
    await this.prisma.userRole.deleteMany({
      where: { userId, role },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'REVOKE_ROLE',
        entity: 'User',
        entityId: userId,
        oldValue: { role },
      },
    });
  }
}
