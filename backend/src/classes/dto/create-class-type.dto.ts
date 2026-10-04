import { IsOptional, IsString } from 'class-validator';

export class CreateClassTypeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  level?: string;
}
