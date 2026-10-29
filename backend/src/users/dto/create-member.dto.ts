import { IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

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

  /** Forfait souscrit à la création : le compte, l'abonnement et l'encaissement sont enregistrés ensemble. */
  @IsOptional()
  @IsString()
  planId?: string;

  @ValidateIf((o: CreateMemberDto) => !!o.planId)
  @IsIn(['CASH', 'TRANSFER', 'CHECK', 'OTHER'])
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER';
}
