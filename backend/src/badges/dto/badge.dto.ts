import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';

export const BADGE_RULES = ['SESSIONS', 'STREAK_WEEKS', 'MEMBER_MONTHS', 'ASSIDUITY'] as const;
export type BadgeRule = (typeof BADGE_RULES)[number];

export class CreateBadgeDto {
  @IsString() @MinLength(1) labelFr!: string;
  @IsOptional() @IsString() labelEn?: string;
  @IsOptional() @IsString() labelAr?: string;
  /** Nom d'icône Material (minuscules, tirets). */
  @IsString() @Matches(/^[a-z0-9-]+$/) icon!: string;
  @IsIn(BADGE_RULES) rule!: BadgeRule;
  @IsInt() @Min(1) @Max(10000) threshold!: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateBadgeDto {
  @IsOptional() @IsString() @MinLength(1) labelFr?: string;
  @IsOptional() @IsString() labelEn?: string | null;
  @IsOptional() @IsString() labelAr?: string | null;
  @IsOptional() @IsString() @Matches(/^[a-z0-9-]+$/) icon?: string;
  @IsOptional() @IsIn(BADGE_RULES) rule?: BadgeRule;
  @IsOptional() @IsInt() @Min(1) @Max(10000) threshold?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ReorderBadgesDto {
  @IsString({ each: true }) ids!: string[];
}
