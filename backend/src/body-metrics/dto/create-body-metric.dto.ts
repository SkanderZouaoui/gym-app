import { IsIn, IsISO8601, IsNumber, IsObject, IsOptional } from 'class-validator';

export class CreateBodyMetricDto {
  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsObject()
  measurements?: Record<string, number>;

  @IsOptional()
  @IsIn(['PRIVATE', 'SHARED_WITH_COACH'])
  visibility?: 'PRIVATE' | 'SHARED_WITH_COACH';
}
