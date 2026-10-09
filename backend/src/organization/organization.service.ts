import { Injectable } from '@nestjs/common';
import { DEFAULT_ATTENDANCE_POLICY, attendancePolicySchema } from '@muscleup/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateAttendancePolicyDto } from './dto/update-attendance-policy.dto.js';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  /** OrganizationSettings est une table à une seule ligne (section 8.1). */
  async getSettings() {
    const existing = await this.prisma.organizationSettings.findFirst();
    if (existing) return existing;

    return this.prisma.organizationSettings.create({
      data: {
        name: 'MuscleUP',
        branding: {},
        features: {},
        attendancePolicy: DEFAULT_ATTENDANCE_POLICY,
      },
    });
  }

  async updateAttendancePolicy(dto: UpdateAttendancePolicyDto, updatedBy: string) {
    const parsed = attendancePolicySchema.parse(dto);
    const settings = await this.getSettings();

    const updated = await this.prisma.organizationSettings.update({
      where: { id: settings.id },
      data: {
        attendancePolicy: parsed,
        version: { increment: 1 },
        updatedBy,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: updatedBy,
        action: 'UPDATE_ATTENDANCE_POLICY',
        entity: 'OrganizationSettings',
        entityId: settings.id,
        oldValue: settings.attendancePolicy as any,
        newValue: parsed,
      },
    });

    return updated;
  }
}
