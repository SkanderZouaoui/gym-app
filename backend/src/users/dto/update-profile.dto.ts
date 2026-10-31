import { IsObject, IsOptional, IsString } from 'class-validator';

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
}
