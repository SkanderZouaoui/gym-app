import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

/** Édition d'un adhérent par un admin/staff — contrairement à PATCH /v1/me
 * (libre-service), ici l'admin peut aussi changer l'e-mail et le statut
 * directement, sans OTP ni mot de passe de confirmation. */
export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';
}
