import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

/** Détail d'une série individuelle — reps et poids propres à chaque série,
 * au lieu d'un réglage unique répété sur toutes les séries. */
export class ProgramExerciseSetInputDto {
  @IsInt()
  @Min(1)
  setNumber!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reps?: number;

  @IsOptional()
  @IsPositive()
  weightKg?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number;
}
