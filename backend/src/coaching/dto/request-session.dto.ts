import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class RequestSessionDto {
  @IsString()
  coachId!: string;

  @IsString()
  branchId!: string;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  @IsOptional()
  @IsString()
  objective?: string;
}
