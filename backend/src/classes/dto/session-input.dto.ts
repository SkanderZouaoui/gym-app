import { IsISO8601, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Création d'un cours ponctuel (hors modèle récurrent) par l'admin. */
export class CreateSessionDto {
  @IsString()
  classTypeId!: string;

  @IsISO8601()
  startsAt!: string;

  /** Durée en minutes ; à défaut, celle du type de cours. */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMin?: number;

  @IsOptional()
  @IsString()
  coachId?: string | null;

  @IsOptional()
  @IsString()
  roomId?: string | null;

  /** Capacité ; à défaut, celle du type de cours. */
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  classTypeId?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMin?: number;

  @IsOptional()
  @IsString()
  coachId?: string | null;

  @IsOptional()
  @IsString()
  roomId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
