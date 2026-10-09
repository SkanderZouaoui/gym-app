import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class RenewMembershipDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;
}
