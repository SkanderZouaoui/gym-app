import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class CreateChallengeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['CLASSES_ATTENDED', 'STREAK_DAYS'])
  metric!: 'CLASSES_ATTENDED' | 'STREAK_DAYS';

  @IsInt()
  @Min(1)
  targetValue!: number;

  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsReward?: number;
}
