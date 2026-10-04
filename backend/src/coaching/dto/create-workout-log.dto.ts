import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class WorkoutSetInputDto {
  @IsString()
  exerciseId!: string;

  @IsInt()
  setNumber!: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsInt()
  reps?: number;

  @IsOptional()
  @IsInt()
  rpe?: number;
}

export class CreateWorkoutLogDto {
  @IsOptional()
  @IsString()
  feeling?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkoutSetInputDto)
  sets!: WorkoutSetInputDto[];
}
