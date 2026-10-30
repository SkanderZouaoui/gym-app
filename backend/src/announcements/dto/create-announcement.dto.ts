import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  planId?: string;

  /** Qui reçoit l'annonce (adhérents par défaut). */
  @IsOptional()
  @IsIn(['MEMBERS', 'STAFF', 'COACH', 'TEAM', 'ALL'])
  audience?: 'MEMBERS' | 'STAFF' | 'COACH' | 'TEAM' | 'ALL';

  @IsOptional()
  @IsIn(['info', 'accent', 'danger'])
  tone?: 'info' | 'accent' | 'danger';

  /** Période d'affichage sur l'accueil adhérent (AAAA-MM-JJ). Sans début : dès maintenant. */
  @IsOptional()
  @IsISO8601()
  startsOn?: string;

  @IsOptional()
  @IsISO8601()
  endsOn?: string;

  /** Envoie aussi une notification push aux destinataires. */
  @IsOptional()
  @IsBoolean()
  push?: boolean;
}
