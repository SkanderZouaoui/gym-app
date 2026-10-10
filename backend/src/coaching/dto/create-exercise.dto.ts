import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  muscleGroup?: string;

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  mediaKey?: string;

  @IsOptional()
  @IsIn(['STRENGTH', 'CARDIO', 'MOBILITY'])
  type?: 'STRENGTH' | 'CARDIO' | 'MOBILITY';

  @IsOptional()
  @IsString()
  level?: string;
}
