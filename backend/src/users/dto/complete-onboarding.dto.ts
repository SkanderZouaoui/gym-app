import { IsIn, IsInt, IsNumber, Max, Min } from 'class-validator';

export class CompleteOnboardingDto {
  @IsIn(['lose_weight', 'build_muscle', 'stay_fit', 'relax'])
  goal!: string;

  @IsIn(['female', 'male'])
  gender!: string;

  @IsInt()
  @Min(100)
  @Max(250)
  heightCm!: number;

  @IsNumber()
  @Min(30)
  @Max(250)
  weightKg!: number;

  @IsInt()
  @Min(10)
  @Max(100)
  age!: number;

  @IsIn(['beginner', 'intermediate', 'advanced'])
  level!: string;

  @IsIn(['1-2', '3-4', '5+'])
  sessionsPerWeek!: string;
}

export class UpdateWeeklyGoalDto {
  @IsIn(['1-2', '3-4', '5+'])
  sessionsPerWeek!: string;
}
