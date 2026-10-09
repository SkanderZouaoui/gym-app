import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateMembershipDto {
  @IsString()
  userId!: string;

  @IsString()
  planId!: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;
}
