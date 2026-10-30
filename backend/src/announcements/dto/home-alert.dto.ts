import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateHomeAlertDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsIn(['info', 'warn', 'urgent'])
  level?: string;

  @IsOptional()
  @IsIn(['Tous', 'Actifs', 'Expirés', 'Équipe', 'Accueil', 'Coachs'])
  audience?: string;

  /** Premier jour d'affichage (AAAA-MM-JJ). */
  @IsISO8601()
  startsOn!: string;

  /** Dernier jour d'affichage (AAAA-MM-JJ). */
  @IsISO8601()
  endsOn!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateHomeAlertDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() @MinLength(1) message?: string;
  @IsOptional() @IsIn(['info', 'warn', 'urgent']) level?: string;
  @IsOptional() @IsIn(['Tous', 'Actifs', 'Expirés', 'Équipe', 'Accueil', 'Coachs']) audience?: string;
  @IsOptional() @IsISO8601() startsOn?: string;
  @IsOptional() @IsISO8601() endsOn?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
