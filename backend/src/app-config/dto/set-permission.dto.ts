import { IsBoolean, IsIn, IsString } from 'class-validator';
import { ALL_ROLES, type Role } from '@muscleup/shared';

export class SetPermissionDto {
  @IsString()
  permission!: string;

  @IsIn(ALL_ROLES)
  role!: Role;

  @IsBoolean()
  allowed!: boolean;
}
