import { IsIn } from 'class-validator';
import { ALL_ROLES, type Role } from '@muscleup/shared';

export class SelectRoleDto {
  @IsIn(ALL_ROLES)
  role!: Role;
}
