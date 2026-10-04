import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsISO8601, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class ProgramExerciseInputDto {
  @IsString()
  exerciseId!: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsInt()
  @Min(1)
  sets!: number;

  @IsString()
  reps!: string;

  @IsOptional()
  @IsInt()
  restSeconds?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ProgramDayInputDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramExerciseInputDto)
  exercises!: ProgramExerciseInputDto[];
}

export class CreateProgramDto {
  @IsString()
  name!: string;

  @IsString()
  assignedToId!: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProgramDayInputDto)
  days!: ProgramDayInputDto[];
}
