import { IsIn } from 'class-validator';
import { ALL_ROLES, type Role } from '@muscleup/shared';

export class AssignRoleDto {
  @IsIn(ALL_ROLES)
  role!: Role;
}
