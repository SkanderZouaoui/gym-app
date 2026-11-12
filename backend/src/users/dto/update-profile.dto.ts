import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  /** Clé de la nouvelle photo ; `null` supprime la photo de profil. */
  photoKey?: string | null;

  @IsOptional()
  @IsObject()
  consents?: Record<string, unknown>;

  /** Genre (accords des textes : « présent / présente »…) ; enregistré dans le profil sportif. */
  @IsOptional()
  @IsIn(['female', 'male'])
  gender?: 'female' | 'male';
}
