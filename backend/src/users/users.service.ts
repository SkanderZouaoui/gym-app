import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Prisma } from '@prisma/client';
import { Role } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { OtpService } from '../otp/otp.service.js';
import type { CreatePrivilegedUserDto } from './dto/create-privileged-user.dto.js';
import type { AssignRoleDto } from './dto/assign-role.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { RequestEmailChangeDto } from './dto/request-email-change.dto.js';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  photoKey: true,
  status: true,
  consents: true,
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
    return this.withPhotoUrl(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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
  async requestAvatarUploadUrl(userId: string, contentType: string) {
    const key = this.storageService.buildKey(`avatars/${userId}`, contentType);
    const uploadUrl = await this.storageService.getUploadUrl(key, contentType);
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

    await this.otpService.generateAndStore(userId, 'EMAIL_CHANGE', dto.newEmail);
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

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
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
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: PUBLIC_USER_SELECT,
      take: 25,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return user;
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

  /** Créé par un admin uniquement — pas d'auto-inscription (section 13). */
  async createPrivilegedUser(dto: CreatePrivilegedUserDto, actorId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, dto.phone ? { phone: dto.phone } : undefined].filter(Boolean) as any },
    });
    if (existing) throw new ConflictException('EMAIL_OR_PHONE_ALREADY_USED');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
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
