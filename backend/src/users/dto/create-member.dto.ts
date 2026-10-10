import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** Création d'un adhérent par un admin/staff (back-office) — distinct de
 * l'auto-inscription publique (/v1/auth/register) : pas d'OTP, saisie
 * directe des infos, mot de passe temporaire communiqué en salle. */
export class CreateMemberDto {
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
}
