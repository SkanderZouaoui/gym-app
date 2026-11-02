import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SetOccupancyOverrideDto {
  @IsInt()
  @Min(0)
  @Max(10_000)
  count!: number;

  /** Durée de validité ; par défaut celle de la politique, bornée par la durée maximale. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
