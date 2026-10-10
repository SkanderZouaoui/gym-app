import { IsEmail, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateCoachDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  sessionPrice?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'ON_LEAVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
}
