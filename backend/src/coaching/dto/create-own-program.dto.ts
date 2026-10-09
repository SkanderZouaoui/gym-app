import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsISO8601, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ProgramExerciseSetInputDto } from './program-exercise-set-input.dto.js';

class OwnProgramExerciseInputDto {
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

  /** Détail par série (reps/poids individuels) — facultatif, remplace l'affichage résumé. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramExerciseSetInputDto)
  setDetails?: ProgramExerciseSetInputDto[];
}

class OwnProgramDayInputDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OwnProgramExerciseInputDto)
  exercises!: OwnProgramExerciseInputDto[];
}

/** Programme personnel : pas d'`assignedToId`, l'adhérent se l'assigne implicitement à lui-même. */
export class CreateOwnProgramDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OwnProgramDayInputDto)
  days!: OwnProgramDayInputDto[];
}
