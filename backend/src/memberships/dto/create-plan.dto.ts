import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  accessCount?: number;

  @IsOptional()
  @IsBoolean()
  isContractual?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisibleInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsString()
  includesLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
