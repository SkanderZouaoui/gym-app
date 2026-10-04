import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  classTypeId!: string;

  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  coachId?: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime doit être au format HH:mm' })
  startTime!: string;

  @IsInt()
  @Min(5)
  durationMin!: number;
}
