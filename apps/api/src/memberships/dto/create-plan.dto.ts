import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
  @IsIn(['INHERIT', 'HOME_ONLY', 'ALL', 'SELECTED'])
  accessScope?: 'INHERIT' | 'HOME_ONLY' | 'ALL' | 'SELECTED';

  @IsOptional()
  @IsIn(['INHERIT', 'ENABLED', 'DISABLED'])
  crossBranchBooking?: 'INHERIT' | 'ENABLED' | 'DISABLED';

  @IsOptional()
  @IsInt()
  @Min(0)
  crossBranchMonthlyQuota?: number;

  @IsOptional()
  @IsBoolean()
  isContractual?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];
}
