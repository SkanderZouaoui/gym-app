import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class StatsQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
