import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@muscleup/shared';

/** Création d'un compte à privilèges (coach, staff, admin) par un admin — section 13. */
export class CreatePrivilegedUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsIn([Role.COACH, Role.STAFF, Role.ADMIN])
  role!: typeof Role.COACH | typeof Role.STAFF | typeof Role.ADMIN;

  /** null/absent = portée réseau (tous les sites). */
  @IsOptional()
  @IsString()
  branchId?: string;
}
