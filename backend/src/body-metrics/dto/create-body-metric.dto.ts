import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateBodyMetricDto {
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsObject()
  measurements?: Record<string, number>;

  @IsOptional()
  @IsString()
  photoKey?: string;

  @IsOptional()
  @IsIn(['PRIVATE', 'SHARED_WITH_COACH'])
  visibility?: 'PRIVATE' | 'SHARED_WITH_COACH';
}
