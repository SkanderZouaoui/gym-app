import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Patch partiel du brouillon de configuration. Chaque section est validée
 * côté service avec les schémas zod partagés (@muscleup/shared) — cette DTO
 * ne fait que vérifier la forme générale (objets/tableaux arbitraires).
 */
export class PatchAppConfigDto {
  @IsOptional()
  @IsObject()
  branding?: Record<string, unknown>;

  @IsOptional()
  homeModules?: unknown[];

  @IsOptional()
  tabs?: unknown[];

  @IsOptional()
  strings?: unknown[];

  @IsOptional()
  @IsObject()
  languages?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  notifSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bookingRules?: Record<string, unknown>;

  /** Libellé de la modification pour l'historique des changements en attente, ex. "Couleur primaire". */
  @IsOptional()
  @IsString()
  changeLabel?: string;
}
